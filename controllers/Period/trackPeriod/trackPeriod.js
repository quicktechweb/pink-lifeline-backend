import { badRequestResponse, checkValidGapBetweenPeriods, notFoundResponse, somethingWentWrong, successResponse } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
import PeriodDateNoteModel from "../../../models/Period/PeriodDateNoteModel.js";

const savePeriodDataIntoDB = async (res, payload) => {
  const newPeriodEntry = {
    bleeding: payload.period?.bleeding,
    symptoms: payload.period?.symptoms,
    spotting: payload.period?.spotting,
  };

  const newPeriodData = await PeriodTracker.create({
    userId: payload.userId,
    currentDate: payload.currentDate,
    startDate: payload?.startDate,
    endDate: payload?.endDate,
    period: [newPeriodEntry],
  });

  return successResponse(res, newPeriodData, "Period log recorded successfully.", "Successfully recorded period log.");
};

export const recordPeriodLog = async (req, res) => {
  try {
    const payload = req.body;

    // ─── 1. VALIDATION ──────────────────────────────────────────────────────────

    if (!payload.userId) {
      return notFoundResponse(res, "User not found.", "User ID is missing.");
    }

    const isUserExist = await User.findOne({ userId: payload.userId });
    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    if (!payload.currentDate) {
      return badRequestResponse(res, "Bad request occurred.", "Current date is required.");
    }

    if (!payload.period?.bleeding && !payload.period?.spotting && !payload.period?.symptoms) {
      return badRequestResponse(res, "Bad request occurred.", "At least one of bleeding, spotting, or symptoms is required.");
    }

    // startDate and endDate are mutually exclusive in a single request.
    // startDate = "I'm starting my period now"
    // endDate   = "My period just ended"
    // Neither   = "Just logging today's data"
    if (payload.startDate && payload.endDate) {
      return badRequestResponse(res, "Bad request occurred.", "startDate and endDate cannot be provided together.");
    }

    // ─── 2. BUILD SHARED OBJECTS ─────────────────────────────────────────────────

    const currentDate = new Date(payload.currentDate);

    const newPeriodEntry = {
      bleeding: payload.period?.bleeding,
      symptoms: payload.period?.symptoms,
      spotting: payload.period?.spotting,
    };

    // ─── 3. FETCH LATEST PERIOD RECORD ──────────────────────────────────────────

    // We always look at the most recent record regardless of whether it is open
    // or closed, so we can make decisions based on its dates.
    const latestPeriod = await PeriodTracker.findOne({ userId: payload.userId }).sort({
      createdAt: -1,
    });

    // ─── 4. CASE: NO PREVIOUS RECORD (brand-new user) ───────────────────────────

    if (!latestPeriod) {
      // endDate makes no sense when there is no period to close.
      if (payload.endDate) {
        return badRequestResponse(res, "Bad request occurred.", "Cannot provide an end date when no period has been started.");
      }

      const newRecord = await PeriodTracker.create({
        userId: payload.userId,
        currentDate,
        // If the user explicitly flagged this as the start, honour it; otherwise
        // treat today as the implicit start.
        startDate: payload.startDate ? new Date(payload.startDate) : currentDate,
        endDate: null,
        period: [newPeriodEntry],
      });

      return successResponse(res, newRecord, "Period log recorded successfully.", "Successfully recorded period log.");
    }

    // ─── 5. CASE: USER IS EXPLICITLY STARTING A NEW PERIOD ──────────────────────

    if (payload.startDate) {
      // Validate that enough time has passed since the previous period started.
      // This is the primary guard against nonsense / duplicate entries.
      const isValidGap = checkValidGapBetweenPeriods(new Date(latestPeriod.startDate), currentDate);

      if (!isValidGap) {
        return badRequestResponse(res, "Frequent period entry detected.", "A new period cannot start this soon after the previous one.");
      }

      // If the previous period was never closed, auto-close it at the date of
      // its last logged entry. This handles the "she forgot to mark the end"
      // scenario.
      if (!latestPeriod.endDate) {
        await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
          endDate: new Date(latestPeriod.currentDate),
        });
      }

      const newRecord = await PeriodTracker.create({
        userId: payload.userId,
        currentDate,
        startDate: new Date(payload.startDate),
        endDate: null,
        period: [newPeriodEntry],
      });

      return successResponse(res, newRecord, "New period started and log recorded successfully.", "Successfully recorded period log.");
    }

    // ─── 6. CASE: USER IS EXPLICITLY CLOSING THE CURRENT PERIOD ─────────────────

    if (payload.endDate) {
      // There must be an open period to close.
      if (latestPeriod.endDate) {
        return badRequestResponse(res, "Bad request occurred.", "No open period found to close. Please start a new period first.");
      }

      const updatedRecord = await PeriodTracker.findByIdAndUpdate(
        latestPeriod._id,
        {
          $push: { period: newPeriodEntry },
          currentDate,
          endDate: new Date(payload.endDate),
        },
        { new: true },
      );

      return successResponse(res, updatedRecord, "Period ended and log recorded successfully.", "Successfully recorded period log.");
    }

    // ─── 7. CASE: DAILY LOG (no startDate, no endDate) ──────────────────────────
    //
    // This is the most common path: the user is just recording today's symptoms.
    // We need to figure out whether she is still in the same period or whether
    // she is starting a new one implicitly (either forgot to mark start, or
    // forgot to close the previous one).

    const hasOpenPeriod = !latestPeriod.endDate;
    const lastEntryDate = new Date(latestPeriod.currentDate);

    if (hasOpenPeriod) {
      // Check if the gap is still within a reasonable period window.
      // If yes → append to the existing open period.
      // If no  → the period clearly ended at some point; auto-close it and
      //           treat today as a new implicit start.
      const isStillSamePeriod = checkValidGapBetweenPeriods(lastEntryDate, currentDate);

      if (isStillSamePeriod) {
        // Normal daily logging within an ongoing period.
        const updatedRecord = await PeriodTracker.findByIdAndUpdate(
          latestPeriod._id,
          {
            $push: { period: newPeriodEntry },
            currentDate,
          },
          { new: true },
        );

        return successResponse(res, updatedRecord, "Period log recorded successfully.", "Successfully recorded period log.");
      } else {
        // Gap is too large to be part of the same period.
        // Auto-close the previous period at its last known entry date, then
        // start a fresh period with today as the implicit start.
        await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
          endDate: lastEntryDate,
        });

        const newRecord = await PeriodTracker.create({
          userId: payload.userId,
          currentDate,
          startDate: currentDate, // implicit start
          endDate: null,
          period: [newPeriodEntry],
        });

        return successResponse(res, newRecord, "Period log recorded successfully.", "Previous period auto-closed. New period started.");
      }
    }

    // Previous period is already closed (user finished last time and is now
    // logging again without marking a new start). Treat today as an implicit
    // new period start, but only if enough time has passed.
    const referenceDate = latestPeriod.endDate ? new Date(latestPeriod.endDate) : lastEntryDate;

    const isValidGap = checkValidGapBetweenPeriods(referenceDate, currentDate);

    if (!isValidGap) {
      return badRequestResponse(res, "Frequent period entry detected.", "A new period entry cannot be added this soon after the previous period ended.");
    }

    // Valid new period starting implicitly (no explicit startDate provided).
    const newRecord = await PeriodTracker.create({
      userId: payload.userId,
      currentDate,
      startDate: currentDate, // implicit start
      endDate: null,
      period: [newPeriodEntry],
    });

    return successResponse(res, newRecord, "Period log recorded successfully.", "Successfully recorded period log.");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
























export const getPeriodData = async (req, res) => {
  try {
    const payload = req.body;
    const { userId } = payload;

    // ✅ userId required
    if (!userId) {
      return notFoundResponse(res, "User not found");
    }

    // ✅ user exist check
    const isUserExist = await User.findOne({
      userId: userId,
    });

    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User email is not registered.");
    }

    // ✅ get all period documents by userId
    const periodData = await PeriodTracker.find({
      userId: userId,
    }).sort({ createdAt: -1 });

    // ✅ no data found
    if (!periodData || periodData.length === 0) {
      return notFoundResponse(res, "No period data found.", "This user has no recorded period logs.");
    }

    // ✅ success response
    return successResponse(res, periodData, "Period data fetched successfully.", "Successfully fetched period history.");
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};































export const getPeriodBasicInsights = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return notFoundResponse(res, "User not found");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    const POST_MENSTRUAL_INTERVAL = Number(process.env.POST_MENSTRUAL_INTERVAL || 10);

    const periodDocs = await PeriodTracker.find({ userId }).sort({
      createdAt: 1,
    });

    const allPeriods = periodDocs
      .flatMap((doc) => doc.period || [])
      .map((p) => ({
        ...p,
        date: new Date(p.date),
      }))
      .sort((a, b) => a.date - b.date);

    if (!allPeriods.length) {
      return successResponse(res, { cycles: [] }, "No period data found.", "Empty dataset.");
    }

    let cycles = [];
    let currentCycle = [];
    let lastDate = null;
    let exceptCurrentCycle = [];

    //cycle count 1
    for (const item of allPeriods) {
      const currentDate = item.date;

      if (!lastDate) {
        currentCycle.push(item);
      } else {
        const diffDays = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
        if (diffDays > POST_MENSTRUAL_INTERVAL) {
          cycles.push(currentCycle);
          currentCycle = [item];
        } else {
          currentCycle.push(item);
        }
      }
      lastDate = currentDate;
    }
    //cycle count 2
    if (currentCycle.length) {
      exceptCurrentCycle = [...cycles];
      cycles.push(currentCycle);
    }

    // successResponse(res,cycles,"take cycles")

    const cycleInsights = cycles.map((cycle, index) => {
      const startDate = cycle[0].date;
      const endDate = cycle[cycle.length - 1].date;

      const cycleDuration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

      const bleedingDays = cycle.filter((d) => d?.bleeding?.flowLevel >= 1);

      const bleedingDuration = bleedingDays.length;

      const symptomFrequency = cycle.reduce((acc, day) => {
        return acc + (day.symptoms?.length || 0);
      }, 0);

      return {
        cycleNumber: index + 1,
        startDate,
        endDate,
        cycleDuration: Math.round(cycleDuration),
        bleedingDuration,
        symptomFrequency,
      };
    });

    return successResponse(
      res,
      {
        totalCycles: cycles.length,
        cycleInsights,
      },
      "Cycle insights generated successfully.",
      "Insights computed successfully.",
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




























export const addDailyNote = async (req, res) => {
  const payload = req.body;
  const userId = req.params.userId;

  // process.exit(0)

  const { time, date, note } = payload;

  try {
    const newDailyNote = await PeriodDateNoteModel.create({ time, date, note, userId: userId });
    successResponse(res, newDailyNote, "Note has been created successfully.", `Period day note has been added.`);
  } catch (error) {
    console.error(error);
    somethingWentWrong(res, error, "Something went wrong.");
  }
};














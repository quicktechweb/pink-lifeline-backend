import { badRequestResponse, isValidNewPeriodGap, isWithinSamePeriod, checkValidGapBetweenPeriods, notFoundResponse, somethingWentWrong, successResponse } from "../../../utils/utils.js";
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

    // ─── 1. VALIDATION ───────────────────────────────────────────────────────

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

    // startDate = "I'm starting my period today"
    // endDate   = "My period just ended today"
    // Neither   = "Just logging today's data (symptoms / bleeding / spotting)"
    if (payload.startDate && payload.endDate) {
      return badRequestResponse(res, "Bad request occurred.", "startDate and endDate cannot be provided together.");
    }

    // ─── 2. SHARED SETUP ─────────────────────────────────────────────────────

    const currentDate = new Date(payload.currentDate);

    const newPeriodEntry = {
      bleeding: payload.period?.bleeding,
      symptoms: payload.period?.symptoms,
      spotting: payload.period?.spotting,
    };

    // ─── 3. FETCH LATEST RECORD ──────────────────────────────────────────────

    const latestPeriod = await PeriodTracker.findOne({ userId: payload.userId }).sort({
      createdAt: -1,
    });

    // ─── 4. BRAND-NEW USER ───────────────────────────────────────────────────

    if (!latestPeriod) {
      if (payload.endDate) {
        return badRequestResponse(res, "Bad request occurred.", "Cannot provide an end date when no period has been started.");
      }

      const newRecord = await PeriodTracker.create({
        userId: payload.userId,
        currentDate,
        startDate: payload.startDate ? new Date(payload.startDate) : currentDate,
        endDate: null,
        period: [newPeriodEntry],
      });

      return successResponse(res, newRecord, "Period log recorded successfully.", "Successfully recorded period log.");
    }

    // ─── 5. EXPLICIT NEW PERIOD START ────────────────────────────────────────

    if (payload.startDate) {
      // Guard against a new period starting too soon after the previous one.
      // Reference point is the previous period's startDate so the full
      // cycle length is validated.
      const referenceDate = latestPeriod.startDate ? new Date(latestPeriod.startDate) : new Date(latestPeriod.currentDate);

      if (!isValidNewPeriodGap(referenceDate, currentDate)) {
        return badRequestResponse(res, "Frequent period entry detected.", "A new period cannot start this soon after the previous one.");
      }

      // Auto-close any period the user forgot to mark as ended.
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

    // ─── 6. EXPLICIT PERIOD END ──────────────────────────────────────────────

    if (payload.endDate) {
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

    // ─── 7. DAILY LOG (no startDate, no endDate) ─────────────────────────────

    const hasOpenPeriod = !latestPeriod.endDate;
    const lastEntryDate = new Date(latestPeriod.currentDate);

    if (hasOpenPeriod) {
      //
      // isWithinSamePeriod allows:
      //   • consecutive days (gap = 1)          → normal ongoing period
      //   • gaps up to 7 days                   → spotting / intermenstrual bleeding
      //
      // If the gap is larger than that the period has clearly ended at some
      // point between then and now, so we auto-close and start fresh.
      //
      if (isWithinSamePeriod(lastEntryDate, currentDate)) {
        // Still within the same period — append and update the latest entry date.
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
        // Gap too large to be the same period (even accounting for spotting).
        // Auto-close the previous period at its last known entry, then start
        // a new implicit period for today.
        await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
          endDate: lastEntryDate,
        });

        const newRecord = await PeriodTracker.create({
          userId: payload.userId,
          currentDate,
          startDate: currentDate,
          endDate: null,
          period: [newPeriodEntry],
        });

        return successResponse(res, newRecord, "Period log recorded successfully.", "Previous period auto-closed. New period started.");
      }
    }

    // Previous period is already closed. The user is logging again without
    // explicitly marking a new start — treat today as an implicit new start,
    // but only if the minimum post-menstrual gap has passed.
    const referenceDate = new Date(latestPeriod.endDate);

    if (!isValidNewPeriodGap(referenceDate, currentDate)) {
      return badRequestResponse(res, "Frequent period entry detected.", "A new period entry cannot be added this soon after the previous period ended.");
    }

    const newRecord = await PeriodTracker.create({
      userId: payload.userId,
      currentDate,
      startDate: currentDate,
      endDate: null,
      period: [newPeriodEntry],
    });

    return successResponse(res, newRecord, "Period log recorded successfully.", "Successfully recorded period log.");
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
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

export const estimatedNextPeriodDate = async (req, res) => {
  const { userId } = req.params;
  try {
    const periodDocs = await PeriodTracker.find({ userId }).sort({
      createdAt: 1,
    });

    return successResponse(res, periodDocs, "All period data is fetched.", "All period data is fetched successfuily.");
  } catch (error) {}
};

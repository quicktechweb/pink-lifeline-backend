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

    if (!payload.period?.bleeding && !payload.period?.spotting?.length && !payload.period?.symptoms?.length) {
      return badRequestResponse(res, "Bad request occurred.", "At least one of bleeding, spotting, or symptoms is required.");
    }

    if (payload.startDate && payload.endDate) {
      return badRequestResponse(res, "Bad request occurred.", "startDate and endDate cannot be provided together.");
    }

    // ─── 2. SHARED SETUP ─────────────────────────────────────────────────────

    const currentDate = new Date(payload.currentDate);

    const bleeding = payload.period?.bleeding
      ? {
          id: payload.period.bleeding.id,
          title: payload.period.bleeding.title,
          flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel) ? payload.period.bleeding.flowLevel : 0,
          hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
        }
      : undefined;

    const rawFlow = payload.period?.bleeding?.flowLevel;
    if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
      return badRequestResponse(res, "Invalid flow level.", "flowLevel must be 0, 1, 2, or 3");
    }

    // ✅ Each period sub-document now carries its own currentDate
    const newPeriodEntry = {
      currentDate,
      bleeding: bleeding,
      symptoms: payload.period?.symptoms ?? [],
      spotting: payload.period?.spotting ?? [],
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
      if (isWithinSamePeriod(lastEntryDate, currentDate)) {
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
        // Gap too large — auto-close previous, start new implicit period.
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

    // Previous period is closed — treat today as an implicit new start.
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
    const { userId } = req.params;

    const cycleHistory = {
      monthName: "",
      totalPeriodDays: 0,
      startDay: 0,
      endDay: 0,
      selfTest: false,
      totalMonthDays: 0,
    };

    const result = {
      estimatedNextPeriodDate: null,
      averageDaysOfPeriods: null,
      averageCycleLength: null,
      sixMonthCycleHistory: [cycleHistory],
    };

    try {
      const allPeriodDocs = await PeriodTracker.find({ userId }).sort({
        createdAt: 1,
      });

      if (allPeriodDocs.length > 0) {
        let totalPeriodEntry = 0;
        let totalPeriodDuration = 0;

        let totalCycleLength = 0;
        let totalCycleCount = 0;

        const result = {
          estimatedNextPeriodDate: null,
          averageDaysOfPeriods: null,
          averageCycleLength: null,
          sixMonthCycleHistory: [],
        };

        const reversedPeriods = [...allPeriodDocs].reverse();

        // only take latest 6 cycles
        const latestSixCycles = reversedPeriods.slice(0, 6);

        latestSixCycles.forEach((currentPeriod, index) => {
          // Skip if no previous cycle exists
          if (index === latestSixCycles.length - 1) return;

          const previousPeriod = latestSixCycles[index + 1];

          const currentStartDate = new Date(currentPeriod.startDate);
          const currentEndDate = new Date(currentPeriod.endDate);

          const previousStartDate = new Date(previousPeriod.startDate);

          const cycleGapInDays = Math.floor((currentStartDate - previousStartDate) / (1000 * 60 * 60 * 24));

          const periodDurationInDays = Math.floor((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1;

          totalCycleLength += cycleGapInDays;
          totalCycleCount++;

          totalPeriodDuration += periodDurationInDays;
          totalPeriodEntry++;

          const monthName = currentStartDate.toLocaleString("default", {
            month: "long",
          });

          // const selfTest = cycleGapInDays < 21 || cycleGapInDays > 35;
          // Generates a 50/50 chance of true or false
          const selfTest = Math.random() < 0.5;
          console.log("🚀 ~ trackPeriod.js:316 ~ getPeriodBasicInsights ~ selfTest:", selfTest)

          result.sixMonthCycleHistory.push({
            monthName,

            totalPeriodDays: periodDurationInDays,

            startDay: currentStartDate.getDate(),

            endDay: currentEndDate.getDate(),

            selfTest,

            totalMonthDays: cycleGapInDays,
          });

          // console.log({
          //   monthName,
          //   cycleGapInDays,
          //   periodDurationInDays,
          // });
        });

        const averageCycleLength = totalCycleCount > 0 ? Math.round(totalCycleLength / totalCycleCount) : 0;

        const averageDaysOfPeriods = totalPeriodEntry > 0 ? Math.round(totalPeriodDuration / totalPeriodEntry) : 0;

        const latestCycle = reversedPeriods[0];

        if (latestCycle?.startDate) {
          const latestStartDate = new Date(latestCycle.startDate);

          latestStartDate.setDate(latestStartDate.getDate() + averageCycleLength);

          result.estimatedNextPeriodDate = latestStartDate.toISOString();
        }

        result.averageDaysOfPeriods = averageDaysOfPeriods;

        result.averageCycleLength = averageCycleLength;

        return successResponse(res, result, "Period insights generated successfully.", "Successfully generated period insights.");

        // process.exit(0);
      }
    } catch (error) {
      return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
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
    return somethingWentWrong(res, error, "Something went wrong while generating insights.");
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

export const previousPeriodsInfo = async (req, res) => {
  const { userId } = req.params;
  try {
    const periodDocs = await PeriodTracker.find({ userId }).sort({
      createdAt: 1,
    });

    return successResponse(res, periodDocs, "All period data is fetched.", "All period data is fetched successfuily.");
  } catch (error) {
    return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
  }
};

import { badRequestResponse, notFoundResponse, successResponse } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";

export const recordPeriodLog = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.userId) {
      return notFoundResponse(res, "User not found.", "User ID is missing.");
    }

    const isUserExist = await User.findOne({ userId: payload.userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    if (!Array.isArray(payload.period) || payload.period.length === 0) {
      return badRequestResponse(res, "Wrong input.", "Period array is required.");
    }

    let tracker = await PeriodTracker.findOne({ userId: payload.userId });

    if (!tracker) {
      tracker = new PeriodTracker({
        userId: payload.userId,
        period: [],
      });
    }


    for (const item of payload.period) {
      if (!item.date) {
        item.date = new Date();
      }

      if (!item.bleeding && !item.symptoms && !item.spotting) {
        return badRequestResponse(res, "Bad request occurred.", "No bleeding, symptoms, or spotting found.");
      }

      if (item?.bleeding) {
        const flowLevel = item?.bleeding?.flowLevel;

        if (flowLevel !== undefined && ![0, 1, 2, 3].includes(flowLevel)) {
          return badRequestResponse(res, "Wrong input.", "Invalid flow level.");
        }
      }

      const existingIndex = tracker.period.findIndex((p) => new Date(p.date).toDateString() === new Date(item.date).toDateString());

      if (existingIndex !== -1) {
        tracker.period[existingIndex] = {
          ...tracker.period[existingIndex]._doc,
          ...item,
        };
      } else {

        tracker.period.push(item);
      }
    }


    await tracker.save();

    return successResponse(res, tracker, "Period log updated successfully.", "Successfully updated period log.");
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
  const payload = req.body;
  const { userId } = payload;

  // ✅ userId required
  if (!userId) {
    return notFoundResponse(res, "User not found");
  }

  // ✅ user exist check
  const isUserExist = await User.findOne({ userId: userId });

  if (!isUserExist) {
    return notFoundResponse(res, "User not found.", "User email is not registered.");
  }

  const POST_MENSTRUAL_INTERVAL = Number(process.env.POST_MENSTRUAL_INTERVAL || 10);

  // get data
  const periodData = await PeriodTracker.find({ userId: userId }).sort({ createdAt: -1 });

  // flatten + sort
  const allPeriods = periodData.flatMap((doc) => doc.period || []).sort((a, b) => new Date(a.date) - new Date(b.date));

  let cycles = [];
  let currentCycle = [];
  let lastDate = null;

  allPeriods.forEach((item) => {
    const currentDate = new Date(item.date);

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
  });

  // push last cycle
  if (currentCycle.length) {
    cycles.push(currentCycle);
  }

  // ===============================
  // ANALYTICS PART (NEW)
  // ===============================

  const cycleInsights = cycles.map((cycle, index) => {
    const startDate = new Date(cycle[0].date);
    const endDate = new Date(cycle[cycle.length - 1].date);

    // cycle duration (full cycle days)
    const cycleDuration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

    // bleeding duration (only flowLevel > 0)
    const bleedingDays = cycle.filter((d) => d.bleeding?.flowLevel > 0);

    const bleedingDuration = bleedingDays.length;

    return {
      cycleNumber: index + 1,
      startDate,
      endDate,
      cycleDuration,
      bleedingDuration,
    };
  });

  // ===============================
  // OUTPUT
  // ===============================

  console.log("Total cycles detected:", cycles.length);

  cycleInsights.forEach((c) => {
    console.log("\n====================");
    console.log(`Cycle ${c.cycleNumber}`);
    console.log("Start:", c.startDate.toISOString());
    console.log("End:", c.endDate.toISOString());
    console.log("Cycle Duration (days):", c.cycleDuration);
    console.log("Bleeding Duration (days):", c.bleedingDuration);
  });

  process.exit(0);
};

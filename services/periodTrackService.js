import { MONTH_ORDER } from "../constant/constant.js";
import { attachSelfTestsToPeriods, computeCycleInsights, expandPeriodAcrossMonths, getAverageCycleLength, getAveragePeriodDuration, getMonthsAgoStart, groupPeriodsIntoCycles } from "../controllers/Period/trackPeriod/trackPeriod.js";
import { UserSelfTest } from "../models/SelfTest/selfTestUserMode.js";
import { getBDCurrentDate } from "../utils/utils.js";
import PeriodTracker from "./../models/Period/PeriodModel.js";





export const getPeriodBasicInsightsService = async (userId) => {
  // Branch A
  const allPeriodDocs = await PeriodTracker.find(
    {
      userId,
      startDate: { $exists: true, $ne: null },
      endDate: { $exists: true, $ne: null },
    },
    { period: 0 }
  ).sort({ startDate: -1 });

  if (allPeriodDocs.length > 0) {
    const result = {
      estimatedNextPeriodDate: null,
      averageDaysOfPeriods: null,
      averageCycleLength: null,
      sixMonthCycleHistory: [],
      selfTestDone:true
    };

    const averageCycleLength = getAverageCycleLength(allPeriodDocs);
    const averageDaysOfPeriods = getAveragePeriodDuration(allPeriodDocs);

    result.averageCycleLength = averageCycleLength;
    result.averageDaysOfPeriods = averageDaysOfPeriods;

    const estimatedNextPeriodDate = new Date(allPeriodDocs[0].startDate);
    estimatedNextPeriodDate.setDate(
      estimatedNextPeriodDate.getDate() + averageCycleLength
    );

    result.estimatedNextPeriodDate = estimatedNextPeriodDate;

    const sixMonthsAgo = getMonthsAgoStart(5);

    const selfTests = await UserSelfTest.aggregate([
      {
        $match: {
          userId,
          currentDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $sort: {
          currentDate: 1,
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: "$currentDate",
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$doc",
        },
      },
      {
        $project: {
          selfTest: 0,
        },
      },
      {
        $sort: {
          currentDate: 1,
        },
      },
    ]);

    const latestSixPeriods = allPeriodDocs.slice(0, 6);

    const expandedPeriods =
      latestSixPeriods.flatMap(expandPeriodAcrossMonths);

result.sixMonthCycleHistory = attachSelfTestsToPeriods(
  expandedPeriods,
  selfTests
)
  .sort(
    (a, b) =>
      MONTH_ORDER.indexOf(a.monthName) -
      MONTH_ORDER.indexOf(b.monthName)
  )
  .slice(0, 6);

// Get current month in Bangladesh
const currentMonth = new Date(getBDCurrentDate()).toLocaleString("en-US", {
  month: "short",
  timeZone: "Asia/Dhaka",
}).toUpperCase(); // JAN, FEB, MAR...

// Check if current month's record has a self test
result.selfTestDone = result.sixMonthCycleHistory.some(
  (item) =>
    item.monthName === currentMonth &&
    item.selfTestDate !== null
);




    return {
      data: result,
      message: "Period insights generated successfully.",
      logMessage: "Successfully generated period insights.",
    };
  }

  // Branch B
  const POST_MENSTRUAL_INTERVAL = Number(
    process.env.POST_MENSTRUAL_INTERVAL || 10
  );

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
    return {
      data: { cycles: [] },
      message: "No period data found.",
      logMessage: "Empty dataset.",
    };
  }

  const cycles = groupPeriodsIntoCycles(
    allPeriods,
    POST_MENSTRUAL_INTERVAL
  );

  const cycleInsights = computeCycleInsights(cycles);

  return {
    data: {
      totalCycles: cycles.length,
      cycleInsights,
    },
    message: "Cycle insights generated successfully.",
    logMessage: "Insights computed successfully.",
  };
};
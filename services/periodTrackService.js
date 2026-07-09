import { MONTH_ORDER } from '../constant/constant.js';
import {
  attachSelfTestsToPeriods,
  computeCycleInsights,
  expandPeriodAcrossMonths,
  getAverageCycleLength,
  getAveragePeriodDuration,
  getMonthsAgoStart,
  groupPeriodsIntoCycles,
} from '../controllers/Period/trackPeriod/trackPeriod.js';
import { UserSelfTest } from '../models/SelfTest/selfTestUserMode.js';
import { getBDCurrentDate } from '../utils/utils.js';
import PeriodTracker from './../models/Period/PeriodModel.js';

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
      selfTestDone: true,
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
          _id: '$currentDate',
          doc: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$doc',
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

    const expandedPeriods = latestSixPeriods.flatMap(expandPeriodAcrossMonths);

    result.sixMonthCycleHistory = attachSelfTestsToPeriods(
      expandedPeriods,
      selfTests
    )
      .sort(
        (a, b) =>
          MONTH_ORDER.indexOf(a.monthName) - MONTH_ORDER.indexOf(b.monthName)
      )
      .slice(0, 6);

    // Get current month in Bangladesh
    const currentMonth = new Date(getBDCurrentDate())
      .toLocaleString('en-US', {
        month: 'short',
        timeZone: 'Asia/Dhaka',
      })
      .toUpperCase(); // JAN, FEB, MAR...

    // Check if current month's record has a self test
    result.selfTestDone = result.sixMonthCycleHistory.some(
      (item) => item.monthName === currentMonth && item.selfTestDate !== null
    );

    return {
      data: result,
      message: 'Period insights generated successfully.',
      logMessage: 'Successfully generated period insights.',
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
      message: 'No period data found.',
      logMessage: 'Empty dataset.',
    };
  }

  const cycles = groupPeriodsIntoCycles(allPeriods, POST_MENSTRUAL_INTERVAL);

  const cycleInsights = computeCycleInsights(cycles);

  return {
    data: {
      totalCycles: cycles.length,
      cycleInsights,
    },
    message: 'Cycle insights generated successfully.',
    logMessage: 'Insights computed successfully.',
  };
};

export const getPeriodBasicInsightsServiceV2 = async (userId) => {
  const currentDate = getBDCurrentDate();
  const currentMonth = currentDate.split('-')[1];

  // Branch A
  const allPeriodDocs = await PeriodTracker.find({
    userId,
    startDate: { $exists: true, $ne: null },
    endDate: { $exists: true, $ne: null },
  }).sort({ startDate: -1 });

  if (allPeriodDocs.length > 0) {
    const result = {
      estimatedNextPeriodDate: null,
      averageDaysOfPeriods: null,
      averageCycleLength: null,
      sixMonthCycleHistory: [],
      selfTestDone: true,
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

    const allPeriods = [];

    allPeriodDocs.forEach((doc) => {
      (doc.period || []).forEach((period) => {
        if (period.currentDate) {
          allPeriods.push(period);
        }
      });
    });

    // Sort newest -> oldest
    allPeriods.sort(
      (a, b) => new Date(b.currentDate) - new Date(a.currentDate)
    );

    // Current BD date
    const currentBDDate = new Date(getBDCurrentDate());

    // Beginning of the month 5 months ago
    const sixMonthsAgo = new Date(currentBDDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // End of current month
    const endOfCurrentMonth = new Date(currentBDDate);
    endOfCurrentMonth.setMonth(endOfCurrentMonth.getMonth() + 1);
    endOfCurrentMonth.setDate(0);
    endOfCurrentMonth.setHours(23, 59, 59, 999);

    // Keep only period objects from the last 6 months
    const lastSixMonthPeriods = allPeriods.filter((period) => {
      const periodDate = new Date(period.currentDate);

      return periodDate >= sixMonthsAgo && periodDate <= endOfCurrentMonth;
    });

    console.log(lastSixMonthPeriods);

    const MONTHS = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];

    // Create a map for quick lookup
    const periodMap = new Map();

    lastSixMonthPeriods.forEach((period) => {
      const key = new Date(period.currentDate).toISOString().split('T')[0];
      periodMap.set(key, period);
    });

    const calendar = [];

    const current = new Date(getBDCurrentDate());

    // Find the latest period day
    let lastPeriodEntry = null;

    const sevenMonthsAgo = new Date(getBDCurrentDate());
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
    sevenMonthsAgo.setDate(1);
    sevenMonthsAgo.setHours(0, 0, 0, 0);

    let selfTests = await UserSelfTest.find(
      {
        userId,
        currentDate: { $gte: sevenMonthsAgo },
      },
      {
        currentDate: 1,
        score: 1,
      }
    ).lean();

    const selfTestMap = new Map();

    selfTests.forEach((item) => {
      const key = new Date(item.currentDate).toISOString().split('T')[0];

      selfTestMap.set(key, item);
    });

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(current);

      monthDate.setMonth(monthDate.getMonth() - i);

      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const dates = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(year, month, day));

        const key = date.toISOString().split('T')[0];

        const period = periodMap.get(key);

        dates.push({
          date: key,
          day,

          isPeriod: !!period,
          isSelfTestDone: !!selfTestMap.get(key),

          period: period || null,
        });
      }

      calendar.push({
        monthName: MONTHS[month],
        year,
        date: dates,
      });
    }

    result.sixMonthCycleHistory = calendar;

    for (const month of calendar) {
      for (const day of month.date) {
        if (day.isPeriod) {
          if (
            !lastPeriodEntry ||
            new Date(day.date) > new Date(lastPeriodEntry.date)
          ) {
            lastPeriodEntry = day;
          }
        }
      }
    }

    // selfTestDone = true only if a self-test exists AFTER the last period entry.
    // If there's no period entry at all, there's nothing to check against — default stays true.
    if (lastPeriodEntry) {
      const lastPeriodDate = new Date(lastPeriodEntry.date);

      const hasSelfTestAfterLastPeriod = selfTests.some(
        (test) => new Date(test.currentDate) > lastPeriodDate
      );

      result.selfTestDone = hasSelfTestAfterLastPeriod;
    }

    return {
      data: result,
      message: 'Period insights generated successfully.',
      logMessage: 'Successfully generated period insights.',
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
      message: 'No period data found.',
      logMessage: 'Empty dataset.',
    };
  }

  const cycles = groupPeriodsIntoCycles(allPeriods, POST_MENSTRUAL_INTERVAL);

  const cycleInsights = computeCycleInsights(cycles);

  return {
    data: {
      totalCycles: cycles.length,
      cycleInsights,
    },
    message: 'Cycle insights generated successfully.',
    logMessage: 'Insights computed successfully.',
  };
};

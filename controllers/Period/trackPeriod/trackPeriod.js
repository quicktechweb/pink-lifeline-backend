import { badRequestResponse, isValidNewPeriodGap, isWithinSamePeriod, checkValidGapBetweenPeriods, notFoundResponse, somethingWentWrong, successResponse, getBleedingTitle, getSpottingTitle, getSymptomTitle } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
import PeriodDateNoteModel from "../../../models/Period/PeriodDateNoteModel.js";
import { Bleeding } from "../../../models/Dropdowns/bleedingDropdownModel.js";
import { Spotting } from "../../../models/Dropdowns/spottingDropdownModel.js";
import { Symptom } from "../../../models/Dropdowns/symptomsDropdownModel.js";
import { UserSelfTest } from "../../../models/SelfTest/selfTestUserMode.js";
import { AVERAGE_PERIOD_DURATION, MONTH_ORDER, POST_MENSTRUAL_INTERVAL } from "../../../constant/constant.js";

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

    if (!payload.currentDate) {
      return badRequestResponse(res, "Bad request occurred.", "Current date is required.");
    }

    const currentDate = new Date(payload.currentDate);
    if (Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "Current date is invalid.");
    }

    if (currentDate.getTime() > Date.now()) {
      return badRequestResponse(res, "Current date cannot be in the future.", "Current date cannot be in the future.");
    }

    if (!payload.period?.bleeding && !payload.period?.spotting?.length && !payload.period?.symptoms?.length) {
      return badRequestResponse(res, "Bad request occurred.", "At least one of bleeding, spotting, or symptoms is required.");
    }

    if (payload.startDate && payload.endDate) {
      return badRequestResponse(res, "Bad request occurred.", "startDate and endDate cannot be provided together.");
    }

    let bleedingTitle;

    if (!payload.period.bleeding.title || payload.period.bleeding.title == null) {
      bleedingTitle = await getBleedingTitle(payload.period.bleeding._id);
    } else {
      bleedingTitle = null;
    }

    const bleeding = payload.period?.bleeding
      ? {
          id: payload.period.bleeding._id,
          title: bleedingTitle,
          flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel) ? payload.period.bleeding.flowLevel : 0,
          hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
        }
      : undefined;

    const rawFlow = payload.period?.bleeding?.flowLevel;
    if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
      return badRequestResponse(res, "Invalid flow level.", "flowLevel must be 0, 1, 2, or 3");
    }

    let symptoms = payload.period?.symptoms;
    if (payload.period?.symptoms) {
      if (symptoms?.length) {
        symptoms = await Promise.all(
          symptoms.map(async (symptom) => ({
            ...symptom,
            title: symptom.title || (await getSymptomTitle(symptom._id)),
          })),
        );
      }
    }

    let spotting = payload.period?.spotting ?? [];
    if (spotting.length) {
      spotting = await Promise.all(
        spotting.map(async (item) => ({
          ...item,
          title: item.title || (await getSpottingTitle(item._id)),
        })),
      );
    }

    const newPeriodEntry = {
      currentDate,
      bleeding: bleeding,
      symptoms: symptoms ?? [],
      spotting: spotting ?? [],
    };

    // ─── 2.5. SAME-DATE ENTRY HELPER ─────────────────────────────────────────
    // Checks if the period[] array of a given tracker document already has
    // an entry whose currentDate falls on the same calendar day as `currentDate`.
    // Returns the array index if found, -1 otherwise.
    const findSameDateIndex = (periodArray) => {
      return periodArray.findIndex((entry) => {
        const entryDate = new Date(entry.currentDate);
        console.log("🚀 ~ trackPeriod.js:418 ~ findSameDateIndex ~ entry.currentDate:", entry.currentDate);
        return entryDate.getFullYear() === currentDate.getFullYear() && entryDate.getMonth() === currentDate.getMonth() && entryDate.getDate() === currentDate.getDate();
      });
    };

    // Builds the correct $set or $push update based on whether an entry for
    // today already exists in the document's period array.
    //
    // If same-date entry found  → $set the existing index in-place (no duplicate)
    // If no same-date entry     → $push a brand-new entry
    const buildPeriodUpdate = (existingPeriodArray) => {
      const sameDateIndex = findSameDateIndex(existingPeriodArray);
      // console.log("🚀 ~ trackPeriod.js:435 ~ buildPeriodUpdate ~ sameDateIndex:", sameDateIndex)

      if (sameDateIndex !== -1) {
        // Overwrite the existing entry at that index using positional $ syntax
        return {
          $set: {
            [`period.${sameDateIndex}`]: newPeriodEntry, // ← update in place
            currentDate,
          },
        };
      }

      // No entry for today yet — push a new one
      return {
        $push: { period: newPeriodEntry },
        $set: { currentDate },
      };
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

      // Check if today already has an entry in this document before pushing
      const updatePayload = buildPeriodUpdate(latestPeriod.period ?? []);

      // Merge endDate into the update — works whether we used $set or $push above
      updatePayload.$set = {
        ...(updatePayload.$set ?? {}),
        endDate: new Date(payload.endDate),
        currentDate,
      };

      const updatedRecord = await PeriodTracker.findByIdAndUpdate(latestPeriod._id, updatePayload, { new: true });

      return successResponse(res, updatedRecord, "Period ended and log recorded successfully.", "Successfully recorded period log.");
    }

    // ─── 7. DAILY LOG (no startDate, no endDate) ─────────────────────────────

    const hasOpenPeriod = !latestPeriod.endDate;
    const lastEntryDate = new Date(latestPeriod.currentDate);

    if (hasOpenPeriod) {
      if (isWithinSamePeriod(lastEntryDate, currentDate)) {
        // Use buildPeriodUpdate — if today already has an entry it updates in place,
        // otherwise it pushes a new one. No more duplicate entries for the same day.
        const updatePayload = buildPeriodUpdate(latestPeriod.period ?? []);

        const updatedRecord = await PeriodTracker.findByIdAndUpdate(latestPeriod._id, updatePayload, { new: true });

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

    // ─── 8. PREVIOUS PERIOD CLOSED — implicit new start ──────────────────────

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

// ─── SHARED VALIDATOR ─────────────────────────────────────────────────────────
// Called by recordPeriodStart and recordPeriodCurrent before any DB writes.
// Returns true if all checks pass, false (with response already sent) otherwise.
const validateRecordPeriodData = async (res, payload) => {
  // ─── 1. VALIDATION ──────────────────────────────────────────────────────────

  // Ensure userId is present in the payload
  if (!payload.userId) {
    notFoundResponse(res, "User not found.", "User ID is missing.");
    return false;
  }

  // Confirm the user actually exists in the DB
  const isUserExist = await User.findOne({ userId: payload.userId });

  if (!isUserExist) {
    notFoundResponse(res, "User not found.", "User is not registered.");
    return false;
  }

  // currentDate is required for all period logging operations
  if (!payload.currentDate) {
    badRequestResponse(res, "Bad request occurred.", "Current date is required.");
    return false;
  }

  // At least one of bleeding, spotting, or symptoms must be provided —
  // an entry with no medical data is meaningless
  if (!payload.period?.bleeding && !payload.period?.spotting?.length && !payload.period?.symptoms?.length) {
    badRequestResponse(res, "Bad request occurred.", "At least one of bleeding, spotting, or symptoms is required.");
    return false;
  }

  // startDate and endDate together are ambiguous — only one boundary
  // should be set per request (start uses recordPeriodStart, end uses recordPeriodEnd)
  if (payload.startDate && payload.endDate) {
    badRequestResponse(res, "Bad request occurred.", "startDate and endDate cannot be provided together.");
    return false;
  }

  return true;
};

// Treat date strings without timezone info as UTC (not local time)
// Parse incoming date string as UTC midnight, strip time component
const parseAsUTCDateOnly = (dateStr) => {
  if (!dateStr) return null;
  // Extract YYYY-MM-DD portion only, then force midnight UTC
  const datePart = dateStr.toString().split("T")[0];
  return new Date(datePart + "T00:00:00.000Z");
};

// Get today as UTC midnight (for future-date comparisons)
const todayUTC = () => {
  const now = new Date();
  return new Date(now.toISOString().split("T")[0] + "T00:00:00.000Z");
};

// Format a Date object back to YYYY-MM-DD string for API responses
const toDateOnly = (date) => new Date(date).toISOString().split("T")[0];

const getAveragePeriodDuration = (periodDocs) => {
  if (!periodDocs.length) return 0;

  const totalPeriodDuration = periodDocs.reduce((sum, p) => sum + (p.periodDuration || 0), 0);

  return Math.round(totalPeriodDuration / periodDocs.length);
};

// // ─── Helper: Average cycle length (in days) ──────────────────────────────────
// // Takes the array of period docs (any order) and returns the rounded average
// // gap between consecutive cycle start dates
export const getAverageCycleLength = (periodDocs) => {
  const sorted = [...periodDocs].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (sorted.length < 2) return 0;

  let totalCycleDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].startDate);
    const curr = new Date(sorted[i].startDate);
    totalCycleDays += Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
  }

  return Math.round(totalCycleDays / (sorted.length - 1));
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

// ─── Helper: Average period duration (in days) ───────────────────────────────
// Takes the array of period docs and returns the rounded average of periodDuration

// // ─── Helper: Average cycle length (in days) ──────────────────────────────────
// // Takes the array of period docs (any order) and returns the rounded average
// // gap between consecutive cycle start dates

// // ─── Controller ──────────────────────────────────────────────────────────────



















// export const getPeriodBasicInsights = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // ─── Branch A: user has period docs with startDate/endDate ───────────────
//     try {
//       const allPeriodDocs = await PeriodTracker.find(
//         {
//           userId,
//           startDate: { $exists: true, $ne: null },
//           endDate: { $exists: true, $ne: null },
//         },
//         { period: 0 },
//       ).sort({ startDate: -1 });

//       if (allPeriodDocs.length > 0) {
//         const result = {
//           estimatedNextPeriodDate: null,
//           averageDaysOfPeriods: null,
//           averageCycleLength: null,
//           sixMonthCycleHistory: [],
//         };

//         // ── Averages ─────────────────────────────────────────────────────────
//         const averageCycleLength = getAverageCycleLength(allPeriodDocs);
//         const averageDaysOfPeriods = getAveragePeriodDuration(allPeriodDocs);

//         result.averageCycleLength = averageCycleLength;
//         result.averageDaysOfPeriods = averageDaysOfPeriods;

//         // ── Estimated next period date ───────────────────────────────────────
//         const estimatedNextPeriodDate = new Date(allPeriodDocs[0].startDate);
//         estimatedNextPeriodDate.setDate(estimatedNextPeriodDate.getDate() + averageCycleLength);
//         result.estimatedNextPeriodDate = estimatedNextPeriodDate;

//         // ── Last 6 months of self-test records ───────────────────────────────
//         const sixMonthsAgo = new Date();
//         sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
//         sixMonthsAgo.setDate(1);
//         sixMonthsAgo.setHours(0, 0, 0, 0);

//         const selfTests = await UserSelfTest.find({ userId, currentDate: { $gte: sixMonthsAgo } }, { selfTest: 0 })
//           .sort({ currentDate: 1 })
//           .lean();

//         // ── Expand latest 6 periods across month boundaries ──────────────────
//         const toMonthName = (d) => d.toLocaleString("en-US", { month: "short" }).toUpperCase();

//         const latestSixPeriods = allPeriodDocs.slice(0, 6);

//         const expandedPeriods = latestSixPeriods.flatMap((period) => {
//           const startDate = new Date(period.startDate);
//           const endDate = new Date(period.endDate);

//           // Period fits inside a single calendar month
//           if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
//             return [
//               {
//                 monthName: toMonthName(startDate),
//                 startDate: period.startDate,
//                 endDate: period.endDate,
//               },
//             ];
//           }

//           // Period spans multiple months — split into per-month segments
//           const segments = [];
//           let cursor = new Date(startDate);

//           while (cursor.getMonth() !== endDate.getMonth() || cursor.getFullYear() !== endDate.getFullYear()) {
//             const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
//             segments.push({
//               monthName: toMonthName(cursor),
//               startDate: new Date(cursor),
//               endDate: new Date(monthEnd),
//             });
//             cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
//           }

//           // Final segment (the month that contains endDate)
//           segments.push({
//             monthName: toMonthName(endDate),
//             startDate: new Date(cursor),
//             endDate: new Date(endDate),
//           });

//           return segments;
//         });

//         // ── Attach self-test dates to their matching months ──────────────────
//         const periodSelfTests = expandedPeriods.flatMap((period) => {
//           const matchingSelfTests = selfTests.filter((selfTest) => {
//             const monthName = new Date(selfTest.currentDate).toLocaleString("en-US", { month: "short" }).toUpperCase();
//             return monthName === period.monthName;
//           });

//           if (matchingSelfTests.length === 0) {
//             return [{ ...period, selfTestDate: null }];
//           }

//           return matchingSelfTests.map((selfTest) => ({
//             ...period,
//             selfTestDate: selfTest.currentDate,
//           }));
//         });

//         result.sixMonthCycleHistory = periodSelfTests.slice(0, 6);

//         return successResponse(res, result, "Period insights generated successfully.", "Successfully generated period insights.");
//       }
//     } catch (error) {
//       return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
//     }

//     // ─── Branch B: fallback — user has legacy period[] array docs ────────────
//     const POST_MENSTRUAL_INTERVAL = Number(process.env.POST_MENSTRUAL_INTERVAL || 10);

//     const periodDocs = await PeriodTracker.find({ userId }).sort({ createdAt: 1 });

//     const allPeriods = periodDocs
//       .flatMap((doc) => doc.period || [])
//       .map((p) => ({ ...p, date: new Date(p.date) }))
//       .sort((a, b) => a.date - b.date);

//     if (!allPeriods.length) {
//       return successResponse(res, { cycles: [] }, "No period data found.", "Empty dataset.");
//     }

//     // Group individual period days into cycles separated by POST_MENSTRUAL_INTERVAL
//     const cycles = [];
//     let currentCycle = [];
//     let lastDate = null;

//     for (const item of allPeriods) {
//       if (!lastDate) {
//         currentCycle.push(item);
//       } else {
//         const diffDays = (item.date - lastDate) / (1000 * 60 * 60 * 24);
//         if (diffDays > POST_MENSTRUAL_INTERVAL) {
//           cycles.push(currentCycle);
//           currentCycle = [item];
//         } else {
//           currentCycle.push(item);
//         }
//       }
//       lastDate = item.date;
//     }

//     if (currentCycle.length) cycles.push(currentCycle);

//     const cycleInsights = cycles.map((cycle, index) => {
//       const startDate = cycle[0].date;
//       const endDate = cycle[cycle.length - 1].date;

//       const cycleDuration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
//       const bleedingDuration = cycle.filter((d) => d?.bleeding?.flowLevel >= 1).length;
//       const symptomFrequency = cycle.reduce((acc, day) => acc + (day.symptoms?.length || 0), 0);

//       return {
//         cycleNumber: index + 1,
//         startDate,
//         endDate,
//         cycleDuration: Math.round(cycleDuration),
//         bleedingDuration,
//         symptomFrequency,
//       };
//     });

//     return successResponse(res, { totalCycles: cycles.length, cycleInsights }, "Cycle insights generated successfully.", "Insights computed successfully.");
//   } catch (error) {
//     console.error(error);
//     return somethingWentWrong(res, error, "Something went wrong while generating insights.");
//   }
// };


// ── Helpers ──────────────────────────────────────────────────────────────

const toMonthName = (d) => new Date(d).toLocaleString("en-US", { month: "short" }).toUpperCase();

/**
 * Splits a single period (with startDate/endDate) into one or more
 * per-calendar-month segments. If the period fits inside a single month,
 * returns a single segment.
 */
const expandPeriodAcrossMonths = (period) => {
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return [
      {
        monthName: toMonthName(startDate),
        startDate: period.startDate,
        endDate: period.endDate,
      },
    ];
  }

  const segments = [];
  let cursor = new Date(startDate);

  while (cursor.getMonth() !== endDate.getMonth() || cursor.getFullYear() !== endDate.getFullYear()) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    segments.push({
      monthName: toMonthName(cursor),
      startDate: new Date(cursor),
      endDate: new Date(monthEnd),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  segments.push({
    monthName: toMonthName(endDate),
    startDate: new Date(cursor),
    endDate: new Date(endDate),
  });

  return segments;
};

/**
 * Attaches matching self-test dates to each expanded period segment,
 * based on month-name match. Periods with no matching self-test get
 * a single entry with selfTestDate: null.
 */

const attachSelfTestsToPeriods = (expandedPeriods, selfTests) => {
  const usedSelfTests = new Set();

  return expandedPeriods.map((period) => {
    const selfTest = selfTests.find((test) => {
      const key = test._id.toString();

      return (
        !usedSelfTests.has(key) &&
        toMonthName(test.currentDate) === period.monthName
      );
    });

    if (!selfTest) {
      return {
        ...period,
        selfTestDate: null,
      };
    }

    usedSelfTests.add(selfTest._id.toString());

    return {
      ...period,
      selfTestDate: selfTest.currentDate,
    };
  });
};
/**
 * Returns the first day of the month, N months before today, at midnight.
 */
const getMonthsAgoStart = (monthsAgo) => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Groups a flat, date-sorted list of period-day entries into cycles,
 * splitting whenever the gap between consecutive days exceeds intervalDays.
 */
const groupPeriodsIntoCycles = (allPeriods, intervalDays) => {
  const cycles = [];
  let currentCycle = [];
  let lastDate = null;

  for (const item of allPeriods) {
    if (!lastDate) {
      currentCycle.push(item);
    } else {
      const diffDays = (item.date - lastDate) / (1000 * 60 * 60 * 24);
      if (diffDays > intervalDays) {
        cycles.push(currentCycle);
        currentCycle = [item];
      } else {
        currentCycle.push(item);
      }
    }
    lastDate = item.date;
  }

  if (currentCycle.length) cycles.push(currentCycle);

  return cycles;
};

/**
 * Computes summary stats (duration, bleeding days, symptom frequency) for
 * each cycle produced by groupPeriodsIntoCycles.
 */
const computeCycleInsights = (cycles) => {
  return cycles.map((cycle, index) => {
    const startDate = cycle[0].date;
    const endDate = cycle[cycle.length - 1].date;

    const cycleDuration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
    const bleedingDuration = cycle.filter((d) => d?.bleeding?.flowLevel >= 1).length;
    const symptomFrequency = cycle.reduce((acc, day) => acc + (day.symptoms?.length || 0), 0);

    return {
      cycleNumber: index + 1,
      startDate,
      endDate,
      cycleDuration: Math.round(cycleDuration),
      bleedingDuration,
      symptomFrequency,
    };
  });
};































// ── Controller ───────────────────────────────────────────────────────────

export const getPeriodBasicInsights = async (req, res) => {
  try {
    const { userId } = req.params;

    // ─── Branch A: user has period docs with startDate/endDate ───────────────
    try {
      const allPeriodDocs = await PeriodTracker.find(
        {
          userId,
          startDate: { $exists: true, $ne: null },
          endDate: { $exists: true, $ne: null },
        },
        { period: 0 },
      ).sort({ startDate: -1 });

      if (allPeriodDocs.length > 0) {
        const result = {
          estimatedNextPeriodDate: null,
          averageDaysOfPeriods: null,
          averageCycleLength: null,
          sixMonthCycleHistory: [],
        };

        const averageCycleLength = getAverageCycleLength(allPeriodDocs);
        const averageDaysOfPeriods = getAveragePeriodDuration(allPeriodDocs);

        result.averageCycleLength = averageCycleLength;
        result.averageDaysOfPeriods = averageDaysOfPeriods;

        const estimatedNextPeriodDate = new Date(allPeriodDocs[0].startDate);
        estimatedNextPeriodDate.setDate(estimatedNextPeriodDate.getDate() + averageCycleLength);
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
      createdAt: 1, // keeps the earliest document for each date
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
        console.log("🚀 ~ trackPeriod.js:792 ~ getPeriodBasicInsights ~ selfTests:", selfTests)

        const latestSixPeriods = allPeriodDocs.slice(0, 6);
        const expandedPeriods = latestSixPeriods.flatMap(expandPeriodAcrossMonths);

        const periodSelfTests = attachSelfTestsToPeriods(expandedPeriods, selfTests);

result.sixMonthCycleHistory = periodSelfTests
  .sort(
    (a, b) =>
      MONTH_ORDER.indexOf(a.monthName) - MONTH_ORDER.indexOf(b.monthName)
  )
  .slice(0, 6);        
  
  
  // console.log("🚀 ~ trackPeriod.js:801 ~ getPeriodBasicInsights ~ result:", result)

        return successResponse(res, result, "Period insights generated successfully.", "Successfully generated period insights.");
      }
    } catch (error) {
      return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
    }

    // ─── Branch B: fallback — user has legacy period[] array docs ────────────
    const POST_MENSTRUAL_INTERVAL = Number(process.env.POST_MENSTRUAL_INTERVAL || 10);

    const periodDocs = await PeriodTracker.find({ userId }).sort({ createdAt: 1 });

    const allPeriods = periodDocs
      .flatMap((doc) => doc.period || [])
      .map((p) => ({ ...p, date: new Date(p.date) }))
      .sort((a, b) => a.date - b.date);

    if (!allPeriods.length) {
      return successResponse(res, { cycles: [] }, "No period data found.", "Empty dataset.");
    }

    const cycles = groupPeriodsIntoCycles(allPeriods, POST_MENSTRUAL_INTERVAL);
    const cycleInsights = computeCycleInsights(cycles);

    return successResponse(res, { totalCycles: cycles.length, cycleInsights }, "Cycle insights generated successfully.", "Insights computed successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong while generating insights.");
  }
};




































// export const getPeriodBasicInsights = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // ─── Branch A: user has period docs with startDate/endDate ───────────────
//     try {
//       const allPeriodDocs = await PeriodTracker.find(
//         {
//           userId,
//           startDate: { $exists: true, $ne: null },
//           endDate: { $exists: true, $ne: null },
//         },
//         { period: 0 },
//       ).sort({ startDate: -1 });

//       if (allPeriodDocs.length > 0) {
//         const result = {
//           estimatedNextPeriodDate: null,
//           averageDaysOfPeriods: null,
//           averageCycleLength: null,
//           sixMonthCycleHistory: [],
//         };

//         const averageCycleLength = getAverageCycleLength(allPeriodDocs);
//         const averageDaysOfPeriods = getAveragePeriodDuration(allPeriodDocs);

//         result.averageCycleLength = averageCycleLength;
//         result.averageDaysOfPeriods = averageDaysOfPeriods;

//         const estimatedNextPeriodDate = new Date(allPeriodDocs[0].startDate);
//         estimatedNextPeriodDate.setDate(estimatedNextPeriodDate.getDate() + averageCycleLength);
//         result.estimatedNextPeriodDate = estimatedNextPeriodDate;

//         const sixMonthsAgo = getMonthsAgoStart(5);

//         const selfTests = await UserSelfTest.find({ userId, currentDate: { $gte: sixMonthsAgo } }, { selfTest: 0 })
//           .sort({ currentDate: 1 })
//           .lean();

//         const latestSixPeriods = allPeriodDocs.slice(0, 6);
//         const expandedPeriods = latestSixPeriods.flatMap(expandPeriodAcrossMonths);

//         const periodSelfTests = attachSelfTestsToPeriods(expandedPeriods, selfTests);

//         result.sixMonthCycleHistory = periodSelfTests.slice(0, 6);

//         return successResponse(res, result, "Period insights generated successfully.", "Successfully generated period insights.");
//       }
//     } catch (error) {
//       return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
//     }

//     // ─── Branch B: fallback — user has legacy period[] array docs ────────────
//     const POST_MENSTRUAL_INTERVAL = Number(process.env.POST_MENSTRUAL_INTERVAL || 10);

//     const periodDocs = await PeriodTracker.find({ userId }).sort({ createdAt: 1 });

//     const allPeriods = periodDocs
//       .flatMap((doc) => doc.period || [])
//       .map((p) => ({ ...p, date: new Date(p.date) }))
//       .sort((a, b) => a.date - b.date);

//     if (!allPeriods.length) {
//       return successResponse(res, { cycles: [] }, "No period data found.", "Empty dataset.");
//     }

//     const cycles = groupPeriodsIntoCycles(allPeriods, POST_MENSTRUAL_INTERVAL);
//     const cycleInsights = computeCycleInsights(cycles);

//     return successResponse(res, { totalCycles: cycles.length, cycleInsights }, "Cycle insights generated successfully.", "Insights computed successfully.");
//   } catch (error) {
//     console.error(error);
//     return somethingWentWrong(res, error, "Something went wrong while generating insights.");
//   }
// };





























export const addDailyNote = async (req, res) => {
  const payload = req.body;
  const userId = req.params.userId;

  const { time, date, note } = payload;

  try {
    const newDailyNote = await PeriodDateNoteModel.create({ time, date, note, userId: userId });
    successResponse(res, newDailyNote, "Note has been created successfully.", `Period day note has been added.`);
  } catch (error) {
    console.error(error);
    somethingWentWrong(res, error, "Something went wrong.");
  }
};

const getTimestamp = () => `[${new Date().toLocaleString()}]`;

export const previousPeriodsInfo = async (req, res) => {
  const { userId } = req.params;
  try {
    const periodDocs = await PeriodTracker.find({ userId }).sort({
      createdAt: 1,
    });

    const isEndedByUser = periodDocs.every((doc) => doc.isEndedByUser === true);

    const failedStartDates = periodDocs.filter((doc) => !doc.isEndedByUser).map((doc) => doc.startDate);
    const formattedDates = failedStartDates.map((date) => date.toISOString().split("T")[0]);
    const activePeriodDate = formattedDates[formattedDates.length - 1];

    console.log(getTimestamp(), "SUCCESS:", "All period data is fetched.");
    return res.status(200).json({
      success: true,
      activePeriodDate,
      isEndedByUser,
      data: periodDocs || [],
      length: periodDocs.length || 0,
      message: "All period data is fetched successfully.",
    });
  } catch (error) {
    return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
  }
};

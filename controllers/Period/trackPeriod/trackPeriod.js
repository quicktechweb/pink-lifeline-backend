import { badRequestResponse, isValidNewPeriodGap, isWithinSamePeriod, checkValidGapBetweenPeriods, notFoundResponse, somethingWentWrong, successResponse, getBleedingTitle, getSpottingTitle, getSymptomTitle } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
import PeriodDateNoteModel from "../../../models/Period/PeriodDateNoteModel.js";
import { Bleeding } from "../../../models/Dropdowns/bleedingDropdownModel.js";
import { Spotting } from "../../../models/Dropdowns/spottingDropdownModel.js";
import { Symptom } from "../../../models/Dropdowns/symptomsDropdownModel.js";
import { UserSelfTest } from "../../../models/SelfTest/selfTestUserMode.js";
import { AVERAGE_PERIOD_DURATION, POST_MENSTRUAL_INTERVAL } from "../../../constant/constant.js";

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
const getAverageCycleLength = (periodDocs) => {
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

































// ─── RECORD PERIOD CURRENT ────────────────────────────────────────────────────
// Logs or updates a single day's period data within an already-active period range.
// If an entry for `currentDate` already exists in the matched doc → $set (update).
// If not → $push (insert new entry).




//   export const recordPeriodCurrent = async (req, res) => {
//     try {
//       const payload = req.body;

//       const currentDate = parseAsUTCDateOnly(payload.currentDate);

//       if (!currentDate || Number.isNaN(currentDate.getTime())) {
//         return badRequestResponse(res, "Current date is invalid.", "Current date is invalid.");
//       }

//       if (currentDate.getTime() > todayUTC().getTime()) {
//         return badRequestResponse(res, "Current date cannot be in the future.", "Current date cannot be in the future.");
//       }

//       const isValid = await validateRecordPeriodData(res, payload);
//       if (isValid === false) return;

//       let bleedingTitle;
//       if (!payload.period.bleeding.title || payload.period.bleeding.title == null) {
//         bleedingTitle = await getBleedingTitle(payload.period.bleeding._id);
//       } else {
//         bleedingTitle = null;
//       }

//       const bleeding = payload.period?.bleeding
//         ? {
//             id: payload.period.bleeding._id,
//             title: bleedingTitle,
//             flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel)
//               ? payload.period.bleeding.flowLevel
//               : 0,
//             hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
//           }
//         : undefined;

//       const rawFlow = payload.period?.bleeding?.flowLevel;
//       if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
//         return badRequestResponse(res, "Invalid flow field.", "flowLevel must be 0, 1, 2, or 3");
//       }

//       let symptoms = payload.period?.symptoms;
//       if (symptoms?.length) {
//         symptoms = await Promise.all(
//           symptoms.map(async (symptom) => ({
//             ...symptom,
//             title: symptom.title || (await getSymptomTitle(symptom._id)),
//           }))
//         );
//       }

//       let spotting = payload.period?.spotting ?? [];
//       if (spotting.length) {
//         spotting = await Promise.all(
//           spotting.map(async (item) => ({
//             ...item,
//             title: item.title || (await getSpottingTitle(item._id)),
//           }))
//         );
//       }

//       const newPeriodEntry = {
//         currentDate,
//         bleeding,
//         symptoms: symptoms ?? [],
//         spotting: spotting ?? [],
//         ...(payload.period?.hasOwnProperty("selfTestDate")
//           ? { selfTestDate: payload.period.selfTestDate }
//           : {}),
//       };

//       // ================================
//       // FIND ACTIVE PERIOD
//       // ================================
// const matchedPeriod = await PeriodTracker.findOne({
//   userId: payload.userId,
// }).sort({ endDate: -1 }); // get latest period cycle


// if (!matchedPeriod) {
//   return badRequestResponse(res, "No period found.", "No period found.");
// }


//     const lastEndDate = parseAsUTCDateOnly(matchedPeriod.endDate);
//     const maxAllowedDate = new Date(lastEndDate);
//     maxAllowedDate.setUTCDate(maxAllowedDate.getUTCDate() + 3);
//     if (currentDate < lastEndDate || currentDate > maxAllowedDate) {
//       return badRequestResponse(
//         res,
//         "Date not allowed",
//         "You can only update within 3 days after last period end date"
//       );
//     }





//       // ================================
//       // UPDATE PERIOD
//       // ================================


//       const updatedPeriod = await PeriodTracker.findOneAndUpdate(
//         { userId: payload.userId },
//         {
//           $push: { period: newPeriodEntry },
//           $set: { endDate: currentDate },
//         },
//         { new: true }
//       );

//       successResponse(res, updatedPeriod, "Period updated successfully.", "Period updated successfully.");


      

//     } catch (error) {
//       console.error(error);
//       return badRequestResponse(res, "Bad request occurred.", error.message);
//     }
//   };

// ─── RECORD PERIOD START ──────────────────────────────────────────────────────
// Creates a brand-new PeriodTracker document for a user.
// Enforces that currentDate === startDate (you can only start a period "today").
// Computes an estimated endDate using AVERAGE_PERIOD_DURATION.
// Rejects the request if the previous period ended too recently (< POST_MENSTRUAL_INTERVAL days ago).




// export const recordPeriodStart = async (req, res) => {
//   try {
//     const payload = req.body;

//     const currentDate = parseAsUTCDateOnly(payload.currentDate);
//     if (!currentDate || Number.isNaN(currentDate.getTime())) {
//       return badRequestResponse(res, "Current date is invalid.", "Current date is invalid.");
//     }  


//     const newDate = new Date(payload.currentDate);

//     // 1. Get latest tracker
//     const tracker = await PeriodTracker.findOne({ userId: payload.userId });
    

//     let periodDuration = AVERAGE_PERIOD_DURATION; // fallback

//     const userPeriods = await PeriodTracker.find({
//       userId: payload.userId,
//       startDate: { $ne: null },
//       endDate: { $ne: null },
//     }).lean();

//     if (userPeriods.length > 0) {
//       const durations = userPeriods.map((period) => {
//         return (
//           Math.floor(
//             (new Date(period.endDate) - new Date(period.startDate)) /
//               (1000 * 60 * 60 * 24)
//           ) + 1
//         );
//       });

//       periodDuration = Math.round(
//         durations.reduce((sum, days) => sum + days, 0) /
//           durations.length
//       );
//     }


//     if (tracker?.period?.length) {
//       // 2. Sort all period entries by date
//       const sortedPeriods = [...tracker.period].sort((a, b) => new Date(a.currentDate) - new Date(b.currentDate));

//       // 3. Find immediate past and future
//       let previous = null;
//       let next = null;

//       for (let i = 0; i < sortedPeriods.length; i++) {
//         const current = new Date(sortedPeriods[i].currentDate);

//         if (current < newDate) {
//           previous = sortedPeriods[i];
//         }

//         if (current > newDate && !next) {
//           next = sortedPeriods[i];
//           break;
//         }
//       }

//       // 4-5. Validate previous gap and future overlap (combined)
// if (previous || next) {
//   // Calculate diff with previous if it exists
//   if (previous) {
//     const diffPrev = Math.floor((newDate - new Date(previous.currentDate)) / (1000 * 60 * 60 * 24));
//     console.log("🚀 ~ trackPeriod.js: diffPrev", diffPrev);
//     if (diffPrev < periodDuration) {
//       return badRequestResponse(res, "Frequent period entry detected.", "A new period cannot start this soon after the previous one.");
//     }
//   }

//   // Calculate diff with next if it exists
//   if (next) {
//     const diffNext = Math.floor((new Date(next.currentDate) - newDate) / (1000 * 60 * 60 * 24));
//     if (diffNext < periodDuration) {
//       return badRequestResponse(res, "Invalid period date.", "This date overlaps with an existing recorded period window.");
//     }
//   }
// }

      
//     }

//     // return badRequestResponse(res, "Frequent period entry detected.", "A new period cannot start this soon after the previous one.");

//     if (currentDate.getTime() > todayUTC().getTime()) {
//       return badRequestResponse(res, "Current date cannot be in the future.", "Current date cannot be in the future.");
//     }

//     if (!payload.startDate) {
//       return badRequestResponse(res, "Start date is required.", "Start date is required.");
//     }

//     const startDate = parseAsUTCDateOnly(payload.startDate);
//     if (!startDate || Number.isNaN(startDate.getTime())) {
//       return badRequestResponse(res, "Start date is invalid.", "Start date is invalid.");
//     }

//     if (currentDate.getTime() !== startDate.getTime()) {
//       return badRequestResponse(res, "Current date and start date must be the same.", "Current date and start date must be the same.");
//     }

//     const isValid = await validateRecordPeriodData(res, payload);
//     if (isValid === false) {
//       return badRequestResponse(res, "Invalid period data.", "Invalid period data.");
//     };

//     let bleedingTitle;
//     if (!payload.period.bleeding.title || payload.period.bleeding.title == null) {
//       bleedingTitle = await getBleedingTitle(payload.period.bleeding._id);
//     } else {
//       bleedingTitle = null;
//     }

//     const bleeding = payload.period?.bleeding
//       ? {
//           id: payload.period.bleeding._id,
//           title: bleedingTitle,
//           flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel) ? payload.period.bleeding.flowLevel : 0,
//           hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
//         }
//       : undefined;

//     const rawFlow = payload.period?.bleeding?.flowLevel;
//     if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
//       return badRequestResponse(res, "Invalid flow field.", "flowLevel must be 0, 1, 2, or 3");
//     }

//     let symptoms = payload.period?.symptoms;
//     if (payload.period?.symptoms) {
//       if (symptoms?.length) {
//         symptoms = await Promise.all(
//           symptoms.map(async (symptom) => ({
//             ...symptom,
//             title: symptom.title || (await getSymptomTitle(symptom._id)),
//           })),
//         );
//       }
//     }

//     let spotting = payload.period?.spotting ?? [];
//     if (spotting.length) {
//       spotting = await Promise.all(
//         spotting.map(async (item) => ({
//           ...item,
//           title: item.title || (await getSpottingTitle(item._id)),
//         })),
//       );
//     }

//     const newPeriodEntry = {
//       currentDate,
//       bleeding,
//       symptoms: symptoms ?? [],
//       spotting: spotting ?? [],
//       ...(payload.period?.hasOwnProperty("selfTestDate") ? { selfTestDate: payload.period.selfTestDate } : {}),
//     };

//     const periodEntries = [newPeriodEntry];

//     for (let i = 1; i < periodDuration; i++) {
//       const nextDate = new Date(currentDate);
//       nextDate.setUTCDate(nextDate.getUTCDate() + i);

//       periodEntries.push({
//         currentDate: nextDate,
//         bleeding: {
//           id: payload.period.bleeding._id,
//           title: bleedingTitle,
//           flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel) ? payload.period.bleeding.flowLevel : 0,
//           hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
//         },
//         symptoms: [],
//         spotting: [],
//       });
//     }

//     if (payload.endDate) {
//       return badRequestResponse(res, "Bad request occurred.", "Cannot provide an end date when no period has been started.");
//     }

//     const latestPeriod = await PeriodTracker.findOne({ userId: payload.userId }).sort({
//       createdAt: -1,
//     });

//     const endDate = new Date(currentDate.getTime() + periodDuration * 24 * 60 * 60 * 1000);

//     if (!latestPeriod) {
//       const newRecord = await PeriodTracker.create({
//         userId: payload.userId,
//         currentDate,
//         startDate: currentDate,
//         endDate,
//         period: periodEntries,
//       });

//       // Format dates as date-only strings for mobile
//       return successResponse(res, newRecord, "Period log recorded successfully.", "Successfully recorded period log.");
//     }

    
//           const newRecord = await PeriodTracker.create({
//         userId: payload.userId,
//         currentDate,
//         startDate: currentDate,
//         endDate,
//         period: periodEntries,
//       });

//       return successResponse(res, newRecord, "Period created successfully");
    
    
//     // const previousEndDate = parseAsUTCDateOnly(latestPeriod.endDate.toISOString());




//     // const gapInDays = Math.floor((startDate.getTime() - previousEndDate.getTime()) / (1000 * 60 * 60 * 24));
//     // console.log("🚀 ~ trackPeriod.js:688 ~ recordPeriodStart ~ gapInDays:", gapInDays)

//     // if (gapInDays >= POST_MENSTRUAL_INTERVAL) {

//     // }

//     return badRequestResponse(res, "Frequent period entry detected.", "A new period cannot start this soon after the previous one.");
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// ─── RECORD PERIOD END ────────────────────────────────────────────────────────
// Closes the user's most recent active period by setting its endDate.
// Also trims any period[] sub-documents whose currentDate falls after the new endDate
// (handles the case where daily entries were logged beyond what turned out to be the actual end).



// export const recordPeriodEnd = async (req, res) => {
//   try {
//     const payload = req.body;
//     const { userId, endDate } = payload;

//     if (!userId) {
//       return badRequestResponse(res, "User not found.", "User ID is required.");
//     }

//     if (!endDate) {
//       return badRequestResponse(res, "Bad request occurred.", "End date is required.");
//     }

//     const parsedEndDate = parseAsUTCDateOnly(endDate);
//     if (!parsedEndDate || Number.isNaN(parsedEndDate.getTime())) {
//       return badRequestResponse(res, "End date is invalid.", "End date is invalid.");
//     }

//     if (!payload.currentDate) {
//       return badRequestResponse(res, "Current date is required.", "Current date is required.");
//     }

//     const currentDate = parseAsUTCDateOnly(payload.currentDate);
//     if (!currentDate || Number.isNaN(currentDate.getTime())) {
//       return badRequestResponse(res, "Current date is invalid.", "Current date is invalid.");
//     }

//     if (currentDate.getTime() > todayUTC().getTime()) {
//       return badRequestResponse(res, "Current date cannot be in the future.", "Current date cannot be in the future.");
//     }

//     if (currentDate.getTime() !== parsedEndDate.getTime()) {
//       return badRequestResponse(res, "Current date and end date must be the same.", "Current date and end date must be the same.");
//     }

//     const latestPeriod = await PeriodTracker.findOne({ userId }).sort({ createdAt: -1 });

//     if (!latestPeriod) {
//       return notFoundResponse(res, "Period not found.", "No period records found.");
//     }

//     const startDateOnly = toDateOnly(latestPeriod.startDate);
//     const endDateOnly = toDateOnly(parsedEndDate);

//     if (endDateOnly < startDateOnly) {
//       return badRequestResponse(res, "Invalid end date.", "End date cannot be earlier than start date.");
//     }

//     latestPeriod.endDate = parsedEndDate;

//     // Trim sub-documents that fall after the user-confirmed end date
//     latestPeriod.period = latestPeriod.period.filter((item) => {
//       return toDateOnly(item.currentDate) <= endDateOnly;
//     });

//     latestPeriod.isEndedByUser = true;

//     const result = await latestPeriod.save();

//     if (!result) {
//       return badRequestResponse(res, "Unable to save the end date.", "Failed to update period.");
//     }

//     return successResponse(res, result, "Period end date updated successfully.", "Successfully updated period.");
//   } catch (error) {
//     console.error(error);
//     return badRequestResponse(res, "Bad request occurred.", error.message);
//   }
// };











// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// const AVERAGE_PERIOD_DURATION = parseInt(process.env.AVERAGE_PERIOD_DURATION) || 5;   // days a cycle lasts
// const POST_MENSTRUAL_INTERVAL = parseInt(process.env.POST_MENSTRUAL_INTERVAL) || 21;  // minimum rest days between cycles
// const MAX_PERIOD_DURATION     = parseInt(process.env.MAX_PERIOD_DURATION)     || 10;  // no cycle can exceed this
// const MAX_EXTEND_DAYS         = parseInt(process.env.MAX_EXTEND_DAYS)         || 3;   // how many days past estimated end recordPeriodCurrent allows


// ─── RECORD PERIOD START ──────────────────────────────────────────────────────
// Creates a brand-new PeriodTracker document for a user.
// Enforces:
//   • currentDate === startDate (you must start "today or a past date, not future")
//   • Minimum POST_MENSTRUAL_INTERVAL gap from previous cycle's endDate
//   • New cycle must not overlap any existing cycle's [startDate, endDate] range
//   • Pre-fills period[] for each day of computed periodDuration
export const recordPeriodStart = async (req, res) => {
  try {
    const payload = req.body;

    // ── 1. Parse & validate currentDate ───────────────────────────────────────
    if (!payload.currentDate) {
      return badRequestResponse(res, "Current date is required.", "currentDate is required.");
    }

    const currentDate = parseAsUTCDateOnly(payload.currentDate);
    if (!currentDate || Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "currentDate must be a valid date string.");
    }

    if (currentDate.getTime() > todayUTC().getTime()) {
      return badRequestResponse(res, "Current date cannot be in the future.", "currentDate cannot be a future date.");
    }

    // ── 2. Parse & validate startDate ─────────────────────────────────────────
    if (!payload.startDate) {
      return badRequestResponse(res, "Start date is required.", "startDate is required.");
    }

    const startDate = parseAsUTCDateOnly(payload.startDate);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      return badRequestResponse(res, "Start date is invalid.", "startDate must be a valid date string.");
    }

    // Real apps enforce: you can only mark a period as starting on the current day
    if (currentDate.getTime() !== startDate.getTime()) {
      return badRequestResponse(
        res,
        "Current date and start date must be the same.",
        "currentDate and startDate must match — you can only start a period on today's date."
      );
    }

    // endDate must NOT be provided at start time — it is computed
    if (payload.endDate) {
      return badRequestResponse(
        res,
        "Bad request occurred.",
        "Do not provide endDate when starting a new period. It will be estimated automatically."
      );
    }

    // ── 3. Validate period payload fields ─────────────────────────────────────
    const isValid = await validateRecordPeriodData(res, payload);
    if (isValid === false) return;

    const rawFlow = payload.period?.bleeding?.flowLevel;
    if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
      return badRequestResponse(res, "Invalid flow field.", "flowLevel must be 0, 1, 2, or 3.");
    }

    // ── 4. Compute periodDuration from user history ───────────────────────────
    // Uses average of all past completed cycles. Falls back to AVERAGE_PERIOD_DURATION.
    // Clamps between 1 and MAX_PERIOD_DURATION so bad history data can't break prefill.
    const userPeriods = await PeriodTracker.find({
      userId: payload.userId,
      startDate: { $ne: null },
      endDate:   { $ne: null },
      isEndedByUser: true, // only count cycles the user actually confirmed ended
    }).lean();

    let periodDuration = AVERAGE_PERIOD_DURATION;

    if (userPeriods.length > 0) {
      const durations = userPeriods.map((p) =>
        Math.round(
          (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      );
      const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
      periodDuration = Math.min(Math.max(avg, 1), MAX_PERIOD_DURATION);
    }

    // ── 5. Gap & overlap checks against ALL existing cycles ───────────────────
    // Real period apps check:
    //   a) Is there an active (not yet ended) cycle? Block until it's closed.
    //   b) Does the new startDate fall inside an existing cycle's window?
    //   c) Is the gap from the previous cycle's endDate less than the minimum rest interval?
    const allCycles = await PeriodTracker.find({ userId: payload.userId })
      .sort({ startDate: -1 })
      .lean();

    if (allCycles.length > 0) {
      // a) Block if any cycle is still active (isEndedByUser is false and estimated end hasn't passed)
      const activeCycle = allCycles.find((c) => !c.isEndedByUser);
      if (activeCycle) {
        const estimatedEnd = parseAsUTCDateOnly(activeCycle.endDate);
        if (estimatedEnd && currentDate.getTime() <= estimatedEnd.getTime()) {
          return badRequestResponse(
            res,
            "Active period already exists.",
            "You have an ongoing period that has not ended yet. Please end it before starting a new one."
          );
        }
        // If estimated end has passed but user never ended it — treat as expired, allow new start
      }

      for (const cycle of allCycles) {
        const cycleStart = parseAsUTCDateOnly(cycle.startDate);
        const cycleEnd   = parseAsUTCDateOnly(cycle.endDate);

        // b) Overlap check — new startDate must not land inside an existing cycle window
        if (cycleStart && cycleEnd) {
          if (startDate.getTime() >= cycleStart.getTime() && startDate.getTime() <= cycleEnd.getTime()) {
            return badRequestResponse(
              res,
              "Invalid period date.",
              "The start date overlaps with an existing recorded period cycle."
            );
          }
        }

        // c) Minimum rest interval — only check against the immediately preceding cycle
        if (cycleEnd && startDate.getTime() > cycleEnd.getTime()) {
          const gapDays = Math.floor(
            (startDate.getTime() - cycleEnd.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (gapDays < POST_MENSTRUAL_INTERVAL) {
            return badRequestResponse(
              res,
              "Frequent period entry detected.",
              `A new period cannot start within ${POST_MENSTRUAL_INTERVAL} days of the previous one ending. Current gap: ${gapDays} day(s).`
            );
          }
          // Only need to check the most recent cycle that precedes startDate — break after first match
          break;
        }
      }
    }

    // ── 6. Resolve titles ─────────────────────────────────────────────────────
    const bleedingTitle =
      payload.period?.bleeding?.title ||
      (await getBleedingTitle(payload.period.bleeding._id));

    const bleeding = payload.period?.bleeding
      ? {
          id:        payload.period.bleeding._id,
          title:     bleedingTitle,
          flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel)
            ? payload.period.bleeding.flowLevel
            : 0,
          hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
        }
      : undefined;

    let symptoms = payload.period?.symptoms ?? [];
    if (symptoms.length) {
      symptoms = await Promise.all(
        symptoms.map(async (s) => ({
          ...s,
          title: s.title || (await getSymptomTitle(s._id)),
        }))
      );
    }

    let spotting = payload.period?.spotting ?? [];
    if (spotting.length) {
      spotting = await Promise.all(
        spotting.map(async (item) => ({
          ...item,
          title: item.title || (await getSpottingTitle(item._id)),
        }))
      );
    }

    // ── 7. Build period[] pre-fill entries ────────────────────────────────────
    // Day 0 (today) gets the full payload data.
    // Days 1..N get skeleton entries with same bleeding ref but empty symptoms/spotting.
    // This lets the user update each day later via recordPeriodCurrent.
    const firstEntry = {
      currentDate,
      bleeding,
      symptoms,
      spotting,
      ...(payload.period?.hasOwnProperty("selfTestDate")
        ? { selfTestDate: payload.period.selfTestDate }
        : {}),
    };

    const periodEntries = [firstEntry];

    for (let i = 1; i < periodDuration; i++) {
      const nextDate = new Date(currentDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + i);

      periodEntries.push({
        currentDate: nextDate,
        bleeding: {
          id:        payload.period.bleeding._id,
          title:     bleedingTitle,
          flowLevel: bleeding.flowLevel,
          hadFlow:   bleeding.hadFlow,
        },
        symptoms: [],
        spotting: [],
      });
    }

    // ── 8. Compute estimated endDate ─────────────────────────────────────────
    // endDate = startDate + (periodDuration - 1) days  (inclusive)
    const endDate = new Date(currentDate);
    endDate.setUTCDate(endDate.getUTCDate() + (periodDuration - 1));

    // ── 9. Save ───────────────────────────────────────────────────────────────
    const newRecord = await PeriodTracker.create({
      userId:      payload.userId,
      currentDate,
      startDate:   currentDate,
      endDate,
      period:      periodEntries,
      isEndedByUser: false,
    });

    return successResponse(
      res,
      newRecord,
      "Period created successfully.",
      "Period log recorded successfully."
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─── RECORD PERIOD CURRENT ────────────────────────────────────────────────────
// Logs or updates a single day's period data within an already-active period.
// Rules:
//   • currentDate must fall within [startDate, endDate + MAX_EXTEND_DAYS]
//   • If an entry for currentDate already exists → $set (upsert, no duplicate)
//   • If not → $push (new entry)
//   • Extending beyond estimated endDate is allowed up to MAX_EXTEND_DAYS
//     (real apps let users mark "still going" for a few extra days)
export const recordPeriodCurrent = async (req, res) => {
  try {
    const payload = req.body;

    // ── 1. Parse & validate currentDate ───────────────────────────────────────
    if (!payload.currentDate) {
      return badRequestResponse(res, "Current date is required.", "currentDate is required.");
    }

    const currentDate = parseAsUTCDateOnly(payload.currentDate);
    if (!currentDate || Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "currentDate must be a valid date string.");
    }

    if (currentDate.getTime() > todayUTC().getTime()) {
      return badRequestResponse(res, "Current date cannot be in the future.", "currentDate cannot be a future date.");
    }

    // ── 2. Validate period payload fields ─────────────────────────────────────
    const isValid = await validateRecordPeriodData(res, payload);
    if (isValid === false) return;

    const rawFlow = payload.period?.bleeding?.flowLevel;
    if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
      return badRequestResponse(res, "Invalid flow field.", "flowLevel must be 0, 1, 2, or 3.");
    }

    // ── 3. Find the active cycle that owns currentDate ─────────────────────────
    // Match by startDate <= currentDate so we pick the right cycle.
    // Sort by startDate desc so most recent cycle wins if dates somehow overlap.
    const matchedPeriod = await PeriodTracker.findOne({
      userId:    payload.userId,
      startDate: { $lte: currentDate },
    }).sort({ startDate: -1 });

    if (!matchedPeriod) {
      return badRequestResponse(
        res,
        "No active period found.",
        "No period cycle found that contains this date. Please start a period first."
      );
    }

    // ── 4. Date window check ──────────────────────────────────────────────────
    // currentDate must be:
    //   >= cycle startDate  (can't update a day before the cycle began)
    //   <= cycle endDate + MAX_EXTEND_DAYS  (allow logging a few days past estimate)
    const cycleStart = parseAsUTCDateOnly(matchedPeriod.startDate);
    const cycleEnd   = parseAsUTCDateOnly(matchedPeriod.endDate);

    const maxAllowedDate = new Date(cycleEnd);
    maxAllowedDate.setUTCDate(maxAllowedDate.getUTCDate() + MAX_EXTEND_DAYS);

    if (currentDate.getTime() < cycleStart.getTime()) {
      return badRequestResponse(
        res,
        "Date not allowed.",
        `Cannot update a day before the period start date (${toDateOnly(cycleStart)}).`
      );
    }

    if (currentDate.getTime() > maxAllowedDate.getTime()) {
      return badRequestResponse(
        res,
        "Date not allowed.",
        `Cannot update a day more than ${MAX_EXTEND_DAYS} day(s) past the estimated period end (${toDateOnly(cycleEnd)}). Please end this period and start a new one.`
      );
    }

    // Block updates on a cycle the user already explicitly ended
    if (matchedPeriod.isEndedByUser) {
      const confirmedEnd = parseAsUTCDateOnly(matchedPeriod.endDate);
      if (currentDate.getTime() > confirmedEnd.getTime()) {
        return badRequestResponse(
          res,
          "Period already ended.",
          "This period cycle has been closed. Start a new period to continue logging."
        );
      }
    }

    // ── 5. Resolve titles ─────────────────────────────────────────────────────
    let bleedingTitle;
    if (!payload.period.bleeding.title || payload.period.bleeding.title == null) {
      bleedingTitle = await getBleedingTitle(payload.period.bleeding._id);
    } else {
      bleedingTitle = payload.period.bleeding.title;
    }

    const bleeding = payload.period?.bleeding
      ? {
          id:        payload.period.bleeding._id,
          title:     bleedingTitle,
          flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel)
            ? payload.period.bleeding.flowLevel
            : 0,
          hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
        }
      : undefined;

    let symptoms = payload.period?.symptoms ?? [];
    if (symptoms.length) {
      symptoms = await Promise.all(
        symptoms.map(async (s) => ({
          ...s,
          title: s.title || (await getSymptomTitle(s._id)),
        }))
      );
    }

    let spotting = payload.period?.spotting ?? [];
    if (spotting.length) {
      spotting = await Promise.all(
        spotting.map(async (item) => ({
          ...item,
          title: item.title || (await getSpottingTitle(item._id)),
        }))
      );
    }

    const newPeriodEntry = {
      currentDate,
      bleeding,
      symptoms,
      spotting,
      ...(payload.period?.hasOwnProperty("selfTestDate")
        ? { selfTestDate: payload.period.selfTestDate }
        : {}),
    };

    // ── 6. Upsert: update existing entry OR push new one ──────────────────────
    // Check if an entry for this exact date already exists in the period[] array.
    // Use ISO date string comparison (date-only) to avoid time component mismatches.
    const currentDateStr = toDateOnly(currentDate);
    const existingEntryIndex = matchedPeriod.period.findIndex(
      (p) => toDateOnly(p.currentDate) === currentDateStr
    );

    let updatedPeriod;

    if (existingEntryIndex !== -1) {
      // Entry exists → update it in place using positional $ operator
      updatedPeriod = await PeriodTracker.findOneAndUpdate(
        {
          _id:                  matchedPeriod._id,
          "period.currentDate": currentDate,
        },
        {
          $set: {
            "period.$": newPeriodEntry,
            // Extend endDate only if currentDate goes beyond current estimated end
            ...(currentDate.getTime() > cycleEnd.getTime()
              ? { endDate: currentDate }
              : {}),
          },
        },
        { new: true }
      );
    } else {
      // No entry for this date → push a new one
      updatedPeriod = await PeriodTracker.findOneAndUpdate(
        { _id: matchedPeriod._id },
        {
          $push: { period: newPeriodEntry },
          // Extend endDate only if currentDate goes beyond current estimated end
          ...(currentDate.getTime() > cycleEnd.getTime()
            ? { $set: { endDate: currentDate } }
            : {}),
        },
        { new: true }
      );
    }

    return successResponse(
      res,
      updatedPeriod,
      "Period updated successfully.",
      "Period updated successfully."
    );
  } catch (error) {
    console.error(error);
    return badRequestResponse(res, "Bad request occurred.", error.message);
  }
};


// ─── RECORD PERIOD END ────────────────────────────────────────────────────────
// Closes the user's most recent active period by confirming its endDate.
// Rules:
//   • currentDate === endDate (you can only end "today")
//   • endDate must be >= startDate and <= startDate + MAX_PERIOD_DURATION
//   • endDate cannot be in the future
//   • Trims any pre-filled period[] entries that fall after the confirmed endDate
//   • Marks isEndedByUser = true so recordPeriodStart can detect a closed cycle
export const recordPeriodEnd = async (req, res) => {
  try {
    const payload = req.body;
    const { userId, endDate } = payload;

    // ── 1. Basic field checks ─────────────────────────────────────────────────
    if (!userId) {
      return badRequestResponse(res, "User not found.", "userId is required.");
    }

    if (!endDate) {
      return badRequestResponse(res, "Bad request occurred.", "endDate is required.");
    }

    if (!payload.currentDate) {
      return badRequestResponse(res, "Current date is required.", "currentDate is required.");
    }

    // ── 2. Parse dates ────────────────────────────────────────────────────────
    const parsedEndDate = parseAsUTCDateOnly(endDate);
    if (!parsedEndDate || Number.isNaN(parsedEndDate.getTime())) {
      return badRequestResponse(res, "End date is invalid.", "endDate must be a valid date string.");
    }

    const currentDate = parseAsUTCDateOnly(payload.currentDate);
    if (!currentDate || Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "currentDate must be a valid date string.");
    }

    // ── 3. currentDate must equal endDate ─────────────────────────────────────
    // Real apps: you end a period on the day you confirm it's over
    if (currentDate.getTime() !== parsedEndDate.getTime()) {
      return badRequestResponse(
        res,
        "Current date and end date must be the same.",
        "currentDate and endDate must match — you can only end a period on today's date."
      );
    }

    // ── 4. Cannot end in the future ───────────────────────────────────────────
    if (currentDate.getTime() > todayUTC().getTime()) {
      return badRequestResponse(
        res,
        "Current date cannot be in the future.",
        "endDate cannot be a future date."
      );
    }

    // ── 5. Fetch the active cycle ─────────────────────────────────────────────
    // "Active" = most recent cycle that has not been explicitly ended by the user
    const latestPeriod = await PeriodTracker.findOne({
      userId,
      isEndedByUser: { $ne: true },
    }).sort({ startDate: -1 });

    if (!latestPeriod) {
      return notFoundResponse(
        res,
        "Period not found.",
        "No active period found. Either no period has been started or all cycles are already closed."
      );
    }

    // ── 6. endDate must be >= startDate ───────────────────────────────────────
    const startDateOnly = toDateOnly(latestPeriod.startDate);
    const endDateOnly   = toDateOnly(parsedEndDate);

    if (endDateOnly < startDateOnly) {
      return badRequestResponse(
        res,
        "Invalid end date.",
        `endDate (${endDateOnly}) cannot be earlier than the period start date (${startDateOnly}).`
      );
    }

    // ── 7. endDate must not exceed MAX_PERIOD_DURATION from startDate ─────────
    // Real apps cap period length — a 60-day "period" is clearly a data error
    const cycleStart   = parseAsUTCDateOnly(latestPeriod.startDate);
    const cycleLengthDays = Math.floor(
      (parsedEndDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    if (cycleLengthDays > MAX_PERIOD_DURATION) {
      return badRequestResponse(
        res,
        "Invalid end date.",
        `A period cannot last more than ${MAX_PERIOD_DURATION} days. This cycle would be ${cycleLengthDays} day(s). If your period has been ongoing this long, please consult a healthcare provider.`
      );
    }

    // ── 8. endDate must not be before any logged period entry ─────────────────
    // Prevent the user from "ending" a period on a date that wipes already-logged days
    const loggedDates = latestPeriod.period.map((p) => toDateOnly(p.currentDate));
    const latestLoggedDate = loggedDates.sort().at(-1); // highest date string (ISO-sortable)

    if (latestLoggedDate && endDateOnly < latestLoggedDate) {
      return badRequestResponse(
        res,
        "Invalid end date.",
        `You have period entries logged as late as ${latestLoggedDate}. The end date cannot be earlier than the last logged entry.`
      );
    }

    // ── 9. Trim pre-filled entries beyond confirmed endDate ───────────────────
    latestPeriod.period = latestPeriod.period.filter(
      (item) => toDateOnly(item.currentDate) <= endDateOnly
    );

    latestPeriod.endDate      = parsedEndDate;
    latestPeriod.isEndedByUser = true;

    const result = await latestPeriod.save();

    if (!result) {
      return badRequestResponse(res, "Unable to save the end date.", "Failed to update period.");
    }

    return successResponse(
      res,
      result,
      "Period end date updated successfully.",
      "Successfully updated period."
    );
  } catch (error) {
    console.error(error);
    return badRequestResponse(res, "Bad request occurred.", error.message);
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

// previous version version of controller.

// export const getPeriodBasicInsights = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const cycleHistory = {
//       monthName: "",
//       totalPeriodDays: 0,
//       startDay: 0,
//       endDay: 0,
//       selfTest: false,
//       totalMonthDays: 0,
//       index: 0,
//     };

//     const result = {
//       estimatedNextPeriodDate: null,
//       averageDaysOfPeriods: null,
//       averageCycleLength: null,
//       sixMonthCycleHistory: [cycleHistory],
//     };

//     try {
//       const allPeriodDocs = await PeriodTracker.find(
//         {
//           userId,
//           startDate: { $exists: true, $ne: null },
//           endDate: { $exists: true, $ne: null },
//         },
//         { period: 0 },
//       ).sort({ startDate: -1 });

//       // res.send({allPeriodDocs,length:allPeriodDocs.length})

//       if (allPeriodDocs.length > 0) {
//         let totalPeriodEntry = 0;
//         let totalPeriodDuration = 0;
//         let totalCycleDays = 0;
//         let totalCycleLength = 0;
//         let totalCycleCount = 0;
//         let averageCycleLength = 0;

//         const result = {
//           estimatedNextPeriodDate: null,
//           averageDaysOfPeriods: null,
//           averageCycleLength: null,
//           sixMonthCycleHistory: [],
//         };

//         //done average cycle duration start

//         const sortedPeriods = [...allPeriodDocs].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

//         for (let i = 1; i < sortedPeriods.length; i++) {
//           const previousStartDate = new Date(sortedPeriods[i - 1].startDate);
//           const currentStartDate = new Date(sortedPeriods[i].startDate);

//           const diffInDays = Math.floor((currentStartDate - previousStartDate) / (1000 * 60 * 60 * 24));

//           totalCycleDays += diffInDays;
//         }

//         result.averageCycleLength = sortedPeriods.length > 1 ? Math.round(totalCycleDays / (sortedPeriods.length - 1)) : 0;
//         averageCycleLength = result.averageCycleLength;
//         totalCycleCount = allPeriodDocs.length - 1;

//         //done average cycle duration complete

//         //done average period duration calculation start

//         totalPeriodDuration = allPeriodDocs.reduce((sum, period) => sum + (period.periodDuration || 0), 0);

//         const averagePeriodDuration = allPeriodDocs.length > 0 ? Math.round(totalPeriodDuration / allPeriodDocs.length) : 0;

//         result.averageDaysOfPeriods = averagePeriodDuration;

//         //done average period duration calculation over

//         //done estimated last period date start

//         const lastPeriodDate = allPeriodDocs[0].startDate;

//         const estimatedNextPeriodDate = new Date(lastPeriodDate);
//         estimatedNextPeriodDate.setDate(estimatedNextPeriodDate.getDate() + averageCycleLength);

//         result.estimatedNextPeriodDate = estimatedNextPeriodDate;

//         //done estimated last period date over

//         //done last 6 months of selftest history start

//         const sixMonthsAgo = new Date();
//         sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
//         sixMonthsAgo.setDate(1);
//         sixMonthsAgo.setHours(0, 0, 0, 0);

//         const selfTests = await UserSelfTest.find({ userId, currentDate: { $gte: sixMonthsAgo } }, { selfTest: 0 })
//           .sort({ currentDate: 1 })
//           .lean();

//         //done last 6 months of selftest history over

//         //done 6 month history start

//         const latestSixPeriods = allPeriodDocs.slice(0, 6);

//         const expandedPeriods = latestSixPeriods.flatMap((period) => {
//           let index = 0;

//           const startDate = new Date(period.startDate);
//           const endDate = new Date(period.endDate);

//           // Same month + same year
//           if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
//             return [
//               {
//                 monthName: startDate.toLocaleString("en-US", { month: "short" }).toUpperCase(), // JAN, FEB, MAR...

//                 startDate: period.startDate,
//                 endDate: period.endDate,
//               },
//             ];
//           }

//           const result = [];
//           let currentStart = new Date(startDate);

//           while (currentStart.getMonth() !== endDate.getMonth() || currentStart.getFullYear() !== endDate.getFullYear()) {
//             const monthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0);

//             result.push({
//               monthName: currentStart.toLocaleString("en-US", { month: "short" }).toUpperCase(),

//               startDate: new Date(currentStart),
//               endDate: new Date(monthEnd),
//             });

//             currentStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
//           }

//           // Final segment
//           result.push({
//             monthName: endDate.toLocaleString("en-US", { month: "short" }).toUpperCase(),

//             startDate: new Date(currentStart),
//             endDate: new Date(endDate),
//           });

//           return result;
//         });

//         //done 6 month history over

//         //done add the self test to coresponding month start

//         const periodSelfTests = expandedPeriods.flatMap((period) => {
//           const matchingSelfTests = selfTests.filter((selfTest) => {
//             const monthName = new Date(selfTest.currentDate).toLocaleString("en-US", { month: "short" }).toUpperCase();

//             return monthName === period.monthName;
//           });

//           if (matchingSelfTests.length === 0) {
//             return [
//               {
//                 ...period,
//                 selfTestDate: null,
//               },
//             ];
//           }

//           return matchingSelfTests.map((selfTest) => ({
//             ...period,
//             selfTestDate: selfTest.currentDate,
//           }));
//         });

//         //done add the self test to coresponding month over

//         //     const cycleHistory = {
//         //   monthName: "",
//         //   totalPeriodDays: 0,
//         //   startDay: 0,
//         //   endDay: 0,
//         //   selfTest: false,
//         //   totalMonthDays: 0,
//         //   index:0
//         // };

//         // const result = {
//         //   estimatedNextPeriodDate: null,
//         //   averageDaysOfPeriods: null,
//         //   averageCycleLength: null,
//         //   sixMonthCycleHistory: [cycleHistory],
//         // };

//         // res.send({expandedPeriods:expandedPeriods.length,selfTests:selfTests.length, periodSelfTests:periodSelfTests})
//         // return

//         result.sixMonthCycleHistory = periodSelfTests.slice(0, 6);

//         successResponse(res, result, "Period insights generated successfully.", "Successfully generated period insights.");

//         // return

//         // latest 6 cycles
//         const latestSixCycles = allPeriodDocs;

//         // Get self tests without selfTest array
//         const allSelfTests = await UserSelfTest.find(
//           { userId },
//           {
//             selfTest: 0,
//             currentDate: 0,
//           },
//         )
//           .sort({ createdAt: -1 })
//           .lean();

//         // Last 6 months only
//         // const sixMonthsAgo = new Date();
//         // sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
//         // sixMonthsAgo.setDate(1);

//         // Create lookup map
//         const selfTestMap = new Map();

//         allSelfTests.forEach((item) => {
//           const createdAt = new Date(item.createdAt);

//           if (createdAt < sixMonthsAgo) return;

//           const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;

//           if (!selfTestMap.has(key)) {
//             selfTestMap.set(key, item);
//           }
//         });

//         latestSixCycles.forEach((currentPeriod, index) => {
//           // Need previous cycle to calculate gap
//           if (index === latestSixCycles.length - 1) return;

//           const previousPeriod = latestSixCycles[index + 1];

//           const currentStartDate = new Date(currentPeriod.startDate);
//           const currentEndDate = new Date(currentPeriod.endDate);

//           const previousStartDate = new Date(previousPeriod.startDate);

//           const cycleGapInDays = Math.floor((currentStartDate - previousStartDate) / (1000 * 60 * 60 * 24));

//           const periodDurationInDays = Math.floor((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1;

//           totalCycleLength += cycleGapInDays;
//           totalCycleCount++;

//           totalPeriodDuration += periodDurationInDays;
//           totalPeriodEntry++;

//           const monthName = currentStartDate.toLocaleString("default", {
//             month: "long",
//           });

//           const selfTestKey = `${currentStartDate.getFullYear()}-${currentStartDate.getMonth()}`;

//           const selfTestData = selfTestMap.get(selfTestKey) || null;

//           result.sixMonthCycleHistory.push({
//             monthName,

//             totalPeriodDays: periodDurationInDays,

//             startDay: currentStartDate.getDate(),

//             endDay: currentEndDate.getDate(),

//             selfTest: selfTestData,

//             totalMonthDays: cycleGapInDays,
//           });
//         });

//         // const averageCycleLength = totalCycleCount > 0 ? Math.round(totalCycleLength / totalCycleCount) : 0;

//         const latestCycle = allPeriodDocs[0];

//         if (latestCycle?.startDate) {
//           const latestStartDate = new Date(latestCycle.startDate);

//           latestStartDate.setDate(latestStartDate.getDate() + averageCycleLength);

//           result.estimatedNextPeriodDate = latestStartDate.toISOString();
//         }

//         result.averageCycleLength = averageCycleLength;

//         return successResponse(res, result, "Period insights generated successfully.", "Successfully generated period insights.");
//       }
//     } catch (error) {
//       return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
//     }

//     const POST_MENSTRUAL_INTERVAL = Number(process.env.POST_MENSTRUAL_INTERVAL || 10);

//     const periodDocs = await PeriodTracker.find({ userId }).sort({
//       createdAt: 1,
//     });

//     const allPeriods = periodDocs
//       .flatMap((doc) => doc.period || [])
//       .map((p) => ({
//         ...p,
//         date: new Date(p.date),
//       }))
//       .sort((a, b) => a.date - b.date);

//     if (!allPeriods.length) {
//       return successResponse(res, { cycles: [] }, "No period data found.", "Empty dataset.");
//     }

//     let cycles = [];
//     let currentCycle = [];
//     let lastDate = null;
//     let exceptCurrentCycle = [];

//     //cycle count 1
//     for (const item of allPeriods) {
//       const currentDate = item.date;

//       if (!lastDate) {
//         currentCycle.push(item);
//       } else {
//         const diffDays = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
//         if (diffDays > POST_MENSTRUAL_INTERVAL) {
//           cycles.push(currentCycle);
//           currentCycle = [item];
//         } else {
//           currentCycle.push(item);
//         }
//       }
//       lastDate = currentDate;
//     }
//     //cycle count 2
//     if (currentCycle.length) {
//       exceptCurrentCycle = [...cycles];
//       cycles.push(currentCycle);
//     }

//     const cycleInsights = cycles.map((cycle, index) => {
//       const startDate = cycle[0].date;
//       const endDate = cycle[cycle.length - 1].date;

//       const cycleDuration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

//       const bleedingDays = cycle.filter((d) => d?.bleeding?.flowLevel >= 1);

//       const bleedingDuration = bleedingDays.length;

//       const symptomFrequency = cycle.reduce((acc, day) => {
//         return acc + (day.symptoms?.length || 0);
//       }, 0);

//       return {
//         cycleNumber: index + 1,
//         startDate,
//         endDate,
//         cycleDuration: Math.round(cycleDuration),
//         bleedingDuration,
//         symptomFrequency,
//       };
//     });

//     return successResponse(
//       res,
//       {
//         totalCycles: cycles.length,
//         cycleInsights,
//       },
//       "Cycle insights generated successfully.",
//       "Insights computed successfully.",
//     );
//   } catch (error) {
//     console.error(error);
//     return somethingWentWrong(res, error, "Something went wrong while generating insights.");
//   }
// };

// ─── Helper: Average period duration (in days) ───────────────────────────────
// Takes the array of period docs and returns the rounded average of periodDuration



// // ─── Helper: Average cycle length (in days) ──────────────────────────────────
// // Takes the array of period docs (any order) and returns the rounded average
// // gap between consecutive cycle start dates


// // ─── Controller ──────────────────────────────────────────────────────────────
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

        // ── Averages ─────────────────────────────────────────────────────────
        const averageCycleLength = getAverageCycleLength(allPeriodDocs);
        const averageDaysOfPeriods = getAveragePeriodDuration(allPeriodDocs);

        result.averageCycleLength = averageCycleLength;
        result.averageDaysOfPeriods = averageDaysOfPeriods;

        // ── Estimated next period date ───────────────────────────────────────
        const estimatedNextPeriodDate = new Date(allPeriodDocs[0].startDate);
        estimatedNextPeriodDate.setDate(estimatedNextPeriodDate.getDate() + averageCycleLength);
        result.estimatedNextPeriodDate = estimatedNextPeriodDate;

        // ── Last 6 months of self-test records ───────────────────────────────
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const selfTests = await UserSelfTest.find({ userId, currentDate: { $gte: sixMonthsAgo } }, { selfTest: 0 })
          .sort({ currentDate: 1 })
          .lean();

        // ── Expand latest 6 periods across month boundaries ──────────────────
        const toMonthName = (d) => d.toLocaleString("en-US", { month: "short" }).toUpperCase();

        const latestSixPeriods = allPeriodDocs.slice(0, 6);

        const expandedPeriods = latestSixPeriods.flatMap((period) => {
          const startDate = new Date(period.startDate);
          const endDate = new Date(period.endDate);

          // Period fits inside a single calendar month
          if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
            return [
              {
                monthName: toMonthName(startDate),
                startDate: period.startDate,
                endDate: period.endDate,
              },
            ];
          }

          // Period spans multiple months — split into per-month segments
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

          // Final segment (the month that contains endDate)
          segments.push({
            monthName: toMonthName(endDate),
            startDate: new Date(cursor),
            endDate: new Date(endDate),
          });

          return segments;
        });

        // ── Attach self-test dates to their matching months ──────────────────
        const periodSelfTests = expandedPeriods.flatMap((period) => {
          const matchingSelfTests = selfTests.filter((selfTest) => {
            const monthName = new Date(selfTest.currentDate).toLocaleString("en-US", { month: "short" }).toUpperCase();
            return monthName === period.monthName;
          });

          if (matchingSelfTests.length === 0) {
            return [{ ...period, selfTestDate: null }];
          }

          return matchingSelfTests.map((selfTest) => ({
            ...period,
            selfTestDate: selfTest.currentDate,
          }));
        });

        result.sixMonthCycleHistory = periodSelfTests.slice(0, 6);

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

    // Group individual period days into cycles separated by POST_MENSTRUAL_INTERVAL
    const cycles = [];
    let currentCycle = [];
    let lastDate = null;

    for (const item of allPeriods) {
      if (!lastDate) {
        currentCycle.push(item);
      } else {
        const diffDays = (item.date - lastDate) / (1000 * 60 * 60 * 24);
        if (diffDays > POST_MENSTRUAL_INTERVAL) {
          cycles.push(currentCycle);
          currentCycle = [item];
        } else {
          currentCycle.push(item);
        }
      }
      lastDate = item.date;
    }

    if (currentCycle.length) cycles.push(currentCycle);

    const cycleInsights = cycles.map((cycle, index) => {
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

    return successResponse(res, { totalCycles: cycles.length, cycleInsights }, "Cycle insights generated successfully.", "Insights computed successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong while generating insights.");
  }
};

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

export const previousPeriodsInfo = async (req, res) => {
  const { userId } = req.params;
  try {
    const periodDocs = await PeriodTracker.find({ userId }).sort({
      createdAt: 1,
    });

    return successResponse(res, periodDocs, "All period data is fetched.", "All period data is fetched successfully.");
  } catch (error) {
    return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
  }
};

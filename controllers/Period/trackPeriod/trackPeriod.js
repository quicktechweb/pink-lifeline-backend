import { badRequestResponse, isValidNewPeriodGap, isWithinSamePeriod, checkValidGapBetweenPeriods, notFoundResponse, somethingWentWrong, successResponse, getBleedingTitle, getSpottingTitle, getSymptomTitle } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
import PeriodDateNoteModel from "../../../models/Period/PeriodDateNoteModel.js";
import { Bleeding } from "../../../models/Dropdowns/bleedingDropdownModel.js";
import { Spotting } from "../../../models/Dropdowns/spottingDropdownModel.js";
import { Symptom } from "../../../models/Dropdowns/symptomsDropdownModel.js";
import { UserSelfTest } from "../../../models/SelfTest/selfTestUserMode.js";
import { AVERAGE_PERIOD_DURATION, POST_MENSTRUAL_INTERVAL } from "../../../constant/constant.js";



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


// export const recordPeriodLog = async (req, res) => {
//   try {
//     const payload = req.body;

//     // ─── 1. VALIDATION ───────────────────────────────────────────────────────

//     if (!payload.userId) {
//       return notFoundResponse(res, "User not found.", "User ID is missing.");
//     }

//     const isUserExist = await User.findOne({ userId: payload.userId });
//     if (!isUserExist) {
//       return notFoundResponse(res, "User not found.", "User is not registered.");
//     }

//     if (!payload.currentDate) {
//       return badRequestResponse(res, "Bad request occurred.", "Current date is required.");
//     }

//     if (!payload.period?.bleeding && !payload.period?.spotting?.length && !payload.period?.symptoms?.length) {
//       return badRequestResponse(res, "Bad request occurred.", "At least one of bleeding, spotting, or symptoms is required.");
//     }

//     if (payload.startDate && payload.endDate) {
//       return badRequestResponse(res, "Bad request occurred.", "startDate and endDate cannot be provided together.");
//     }

//     // // ─── 1.5. GET DROP DOWN DATA ─────────────────────────────────────────────────────

//     // const bleedingOptions = await Bleeding.find().sort({createdAt: -1});

//     // const spottingOptions = await Spotting.find().sort({createdAt: -1});

//     // const symptomOptions = await Symptom.find().sort({createdAt: -1});

//     // ─── 2. SHARED SETUP ─────────────────────────────────────────────────────

//     const currentDate = new Date(payload.currentDate);

//     const bleeding = payload.period?.bleeding
//       ? {
//           id: payload.period.bleeding.id,
//           title: payload.period.bleeding.title ? await getBleedingTitle(payload.period.bleeding.id) : null,
//           flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel) ? payload.period.bleeding.flowLevel : 0,
//           hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
//         }
//       : undefined;

//     const rawFlow = payload.period?.bleeding?.flowLevel;
//     if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
//       return badRequestResponse(res, "Invalid flow level.", "flowLevel must be 0, 1, 2, or 3");
//     }

//     let symptoms = payload.period?.symptoms;
//     if (payload.period?.symptoms) {

//       if (symptoms?.length) {
//         symptoms = await Promise.all(
//           symptoms.map(async (symptom) => ({
//             ...symptom,
//             title: symptom.title || await getSymptomTitle(symptom._id),
//           }))
//         );
//       }
//     }

//     let spotting = payload.period?.spotting ?? [];

//     if (spotting.length) {
//       spotting = await Promise.all(
//         spotting.map(async (item) => ({
//           ...item,
//           title: item.title || await getSpottingTitle(item._id),
//         }))
//       );
//     }

//     // ✅ Each period sub-document now carries its own currentDate
//     const newPeriodEntry = {
//       currentDate,
//       bleeding: bleeding,
//       symptoms: symptoms ?? [],
//       spotting: spotting ?? [],
//     };

//     // ─── 3. FETCH LATEST RECORD ──────────────────────────────────────────────

//     const latestPeriod = await PeriodTracker.findOne({ userId: payload.userId }).sort({
//       createdAt: -1,
//     });

//     // ─── 4. BRAND-NEW USER ───────────────────────────────────────────────────

//     if (!latestPeriod) {
//       if (payload.endDate) {
//         return badRequestResponse(res, "Bad request occurred.", "Cannot provide an end date when no period has been started.");
//       }

//       const newRecord = await PeriodTracker.create({
//         userId: payload.userId,
//         currentDate,
//         startDate: payload.startDate ? new Date(payload.startDate) : currentDate,
//         endDate: null,
//         period: [newPeriodEntry],
//       });

//       return successResponse(res, newRecord, "Period log recorded successfully.", "Successfully recorded period log.");
//     }

//     // ─── 5. EXPLICIT NEW PERIOD START ────────────────────────────────────────

//     if (payload.startDate) {
//       const referenceDate = latestPeriod.startDate ? new Date(latestPeriod.startDate) : new Date(latestPeriod.currentDate);

//       if (!isValidNewPeriodGap(referenceDate, currentDate)) {
//         return badRequestResponse(res, "Frequent period entry detected.", "A new period cannot start this soon after the previous one.");
//       }

//       // Auto-close any period the user forgot to mark as ended.
//       if (!latestPeriod.endDate) {
//         await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
//           endDate: new Date(latestPeriod.currentDate),
//         });
//       }

//       const newRecord = await PeriodTracker.create({
//         userId: payload.userId,
//         currentDate,
//         startDate: new Date(payload.startDate),
//         endDate: null,
//         period: [newPeriodEntry],
//       });

//       return successResponse(res, newRecord, "New period started and log recorded successfully.", "Successfully recorded period log.");
//     }

//     // ─── 6. EXPLICIT PERIOD END ──────────────────────────────────────────────

//     if (payload.endDate) {
//       if (latestPeriod.endDate) {
//         return badRequestResponse(res, "Bad request occurred.", "No open period found to close. Please start a new period first.");
//       }

//       const updatedRecord = await PeriodTracker.findByIdAndUpdate(
//         latestPeriod._id,
//         {
//           $push: { period: newPeriodEntry },
//           currentDate,
//           endDate: new Date(payload.endDate),
//         },
//         { new: true },
//       );

//       return successResponse(res, updatedRecord, "Period ended and log recorded successfully.", "Successfully recorded period log.");
//     }

//     // ─── 7. DAILY LOG (no startDate, no endDate) ─────────────────────────────

//     const hasOpenPeriod = !latestPeriod.endDate;
//     const lastEntryDate = new Date(latestPeriod.currentDate);

//     if (hasOpenPeriod) {
//       if (isWithinSamePeriod(lastEntryDate, currentDate)) {
//         const updatedRecord = await PeriodTracker.findByIdAndUpdate(
//           latestPeriod._id,
//           {
//             $push: { period: newPeriodEntry },
//             currentDate,
//           },
//           { new: true },
//         );

//         return successResponse(res, updatedRecord, "Period log recorded successfully.", "Successfully recorded period log.");
//       } else {
//         // Gap too large — auto-close previous, start new implicit period.
//         await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
//           endDate: lastEntryDate,
//         });

//         const newRecord = await PeriodTracker.create({
//           userId: payload.userId,
//           currentDate,
//           startDate: currentDate,
//           endDate: null,
//           period: [newPeriodEntry],
//         });

//         return successResponse(res, newRecord, "Period log recorded successfully.", "Previous period auto-closed. New period started.");
//       }
//     }

//     // Previous period is closed — treat today as an implicit new start.
//     const referenceDate = new Date(latestPeriod.endDate);

//     if (!isValidNewPeriodGap(referenceDate, currentDate)) {
//       return badRequestResponse(res, "Frequent period entry detected.", "A new period entry cannot be added this soon after the previous period ended.");
//     }

//     const newRecord = await PeriodTracker.create({
//       userId: payload.userId,
//       currentDate,
//       startDate: currentDate,
//       endDate: null,
//       period: [newPeriodEntry],
//     });

//     return successResponse(res, newRecord, "Period log recorded successfully.", "Successfully recorded period log.");
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };































































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
  if (
    !payload.period?.bleeding &&
    !payload.period?.spotting?.length &&
    !payload.period?.symptoms?.length
  ) {
    badRequestResponse(
      res,
      "Bad request occurred.",
      "At least one of bleeding, spotting, or symptoms is required."
    );
    return false;
  }

  // startDate and endDate together are ambiguous — only one boundary
  // should be set per request (start uses recordPeriodStart, end uses recordPeriodEnd)
  if (payload.startDate && payload.endDate) {
    badRequestResponse(
      res,
      "Bad request occurred.",
      "startDate and endDate cannot be provided together."
    );
    return false;
  }

  return true;
};




































// ─── RECORD PERIOD CURRENT ────────────────────────────────────────────────────
// Logs or updates a single day's period data within an already-active period range.
// If an entry for `currentDate` already exists in the matched doc → $set (update).
// If not → $push (insert new entry).
export const recordPeriodCurrent = async (req, res) => {
  try {
    const payload = req.body;
    const currentDate = new Date(payload.currentDate);

    // Reject unparseable date strings early
    if (Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "Current date is invalid.");
    }

    // Prevent logging future dates — period data must be for today or earlier
    if (currentDate.getTime() > Date.now()) {
      return badRequestResponse(
        res,
        "Current date cannot be in the future.",
        "Current date cannot be in the future."
      );
    }

    // Run shared payload validation (userId, user existence, required fields)
    const isValid = await validateRecordPeriodData(res, payload);
    if (isValid === false) return;

    // Fetch all period docs for this user to find the one whose range
    // covers currentDate (a user may have multiple historical period docs)
    const allPeriodDocs = await PeriodTracker.find({ userId: payload.userId });

    // Resolve bleeding title from DB if not provided in payload
    let bleedingTitle;
    if (!payload.period.bleeding.title || payload.period.bleeding.title == null) {
      bleedingTitle = await getBleedingTitle(payload.period.bleeding._id);
    } else {
      bleedingTitle = null;
    }

    // Normalise bleeding object — clamp flowLevel to valid range [0–3],
    // derive hadFlow boolean from whether flow is non-zero
    const bleeding = payload.period?.bleeding
      ? {
          id: payload.period.bleeding._id,
          title: bleedingTitle,
          flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel)
            ? payload.period.bleeding.flowLevel
            : 0,
          hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
        }
      : undefined;

    // Secondary guard: if flowLevel was explicitly provided but out of range, reject
    const rawFlow = payload.period?.bleeding?.flowLevel;
    if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
      return badRequestResponse(res, "Invalid flow field.", "flowLevel must be 0, 1, 2, or 3");
    }

    // Resolve symptom titles from DB for any symptom missing a title
    let symptoms = payload.period?.symptoms;
    if (payload.period?.symptoms) {
      if (symptoms?.length) {
        symptoms = await Promise.all(
          symptoms.map(async (symptom) => ({
            ...symptom,
            title: symptom.title || (await getSymptomTitle(symptom._id)),
          }))
        );
      }
    }

    // Resolve spotting titles from DB for any spotting entry missing a title
    let spotting = payload.period?.spotting ?? [];
    if (spotting.length) {
      spotting = await Promise.all(
        spotting.map(async (item) => ({
          ...item,
          title: item.title || (await getSpottingTitle(item._id)),
        }))
      );
    }

    // Assemble the normalised period sub-document to insert or update with
    const newPeriodEntry = {
      currentDate,
      bleeding,
      symptoms: symptoms ?? [],
      spotting: spotting ?? [],
      ...(payload.period?.hasOwnProperty("selfTestDate") ? { selfTestDate: payload.period.selfTestDate } : {}),
    };

    // Find the period doc whose startDate–endDate window contains currentDate
    const matchedPeriod = allPeriodDocs.find((doc) => {
      const start = new Date(doc.startDate);
      const end = new Date(doc.endDate);
      return currentDate >= start && currentDate <= end;
    });

    // currentDate must fall inside an active period range — standalone dates are rejected
    if (!matchedPeriod) {
      return badRequestResponse(
        res,
        "Invalid period date.",
        "The provided date does not fall within any active period range."
      );
    }

    // Check if this exact calendar day already has an entry in the period array
    const existingEntry = matchedPeriod.period.find(
      (p) => new Date(p.currentDate).toDateString() === currentDate.toDateString()
    );

    if (existingEntry) {
      // ── UPDATE PATH: overwrite bleeding/symptoms/spotting for the existing day ──
      const updateFields = {
        "period.$.bleeding": bleeding,
        "period.$.symptoms": symptoms ?? [],
        "period.$.spotting": spotting ?? [],
      };

      if (payload.period?.hasOwnProperty("selfTestDate")) {
        updateFields["period.$.selfTestDate"] = payload.period.selfTestDate;
      }

      const updatedResponse = await PeriodTracker.updateOne(
        {
          _id: matchedPeriod._id,
          "period._id": existingEntry._id, // positional operator target
        },
        { 
          $set: updateFields 
        },
        {
          new: true, // return updated document
        }
      );
      return successResponse(res, updatedResponse, "Period updated successfully.", "Period updated successfully.");
    } else {
      // ── INSERT PATH: no entry for this day yet, push a new sub-document ──
      const updatedResponse = await PeriodTracker.updateOne(
        { _id: matchedPeriod._id },
        { $push: { period: newPeriodEntry } }
      );
      return successResponse(res, updatedResponse, "Period updated successfully.", "Period updated successfully.");
    }
  } catch (error) {
    console.error(error);
    return badRequestResponse(res, "Bad request occurred.", error.message);
  }
};






















































// ─── RECORD PERIOD START ──────────────────────────────────────────────────────
// Creates a brand-new PeriodTracker document for a user.
// Enforces that currentDate === startDate (you can only start a period "today").
// Computes an estimated endDate using AVERAGE_PERIOD_DURATION.
// Rejects the request if the previous period ended too recently (< POST_MENSTRUAL_INTERVAL days ago).
export const recordPeriodStart = async (req, res) => {
  try {
    const payload = req.body;
    const currentDate = new Date(payload.currentDate);

    // Reject unparseable date strings early
    if (Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "Current date is invalid.");
    }

    // Prevent logging future start dates
    if (currentDate.getTime() > Date.now()) {
      return badRequestResponse(
        res,
        "Current date cannot be in the future.",
        "Current date cannot be in the future."
      );
    }

    // startDate is mandatory for this endpoint
    if (!payload.startDate) {
      return badRequestResponse(res, "Start date is required.", "Start date is required.");
    }

    const startDate = new Date(payload.startDate);

    if (Number.isNaN(startDate.getTime())) {
      return badRequestResponse(res, "Start date is invalid.", "Start date is invalid.");
    }

    // The period must be started on the same day it is recorded —
    // back-dated period starts are not allowed through this endpoint
    const isSameDay =
      currentDate.getUTCFullYear() === startDate.getUTCFullYear() &&
      currentDate.getUTCMonth() === startDate.getUTCMonth() &&
      currentDate.getUTCDate() === startDate.getUTCDate();

    if (!isSameDay) {
      return badRequestResponse(
        res,
        "Current date and start date must be the same.",
        "Current date and start date must be the same."
      );
    }

    // Run shared payload validation (userId, user existence, required period fields)
    const isValid = await validateRecordPeriodData(res, payload);
    if (isValid === false) return;

    // Resolve bleeding title from DB if not supplied in payload
    let bleedingTitle;
    if (!payload.period.bleeding.title || payload.period.bleeding.title == null) {
      bleedingTitle = await getBleedingTitle(payload.period.bleeding._id);
    } else {
      bleedingTitle = null;
    }

    // Normalise bleeding — clamp flowLevel, derive hadFlow
    const bleeding = payload.period?.bleeding
      ? {
          id: payload.period.bleeding._id,
          title: bleedingTitle,
          flowLevel: [0, 1, 2, 3].includes(payload.period?.bleeding?.flowLevel)
            ? payload.period.bleeding.flowLevel
            : 0,
          hadFlow: (payload.period.bleeding.flowLevel ?? 0) !== 0,
        }
      : undefined;

    // Secondary guard for out-of-range flowLevel
    const rawFlow = payload.period?.bleeding?.flowLevel;
    if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
      return badRequestResponse(res, "Invalid flow field.", "flowLevel must be 0, 1, 2, or 3");
    }

    // Resolve symptom titles from DB for any missing title
    let symptoms = payload.period?.symptoms;
    if (payload.period?.symptoms) {
      if (symptoms?.length) {
        symptoms = await Promise.all(
          symptoms.map(async (symptom) => ({
            ...symptom,
            title: symptom.title || (await getSymptomTitle(symptom._id)),
          }))
        );
      }
    }

    // Resolve spotting titles from DB for any missing title
    let spotting = payload.period?.spotting ?? [];
    if (spotting.length) {
      spotting = await Promise.all(
        spotting.map(async (item) => ({
          ...item,
          title: item.title || (await getSpottingTitle(item._id)),
        }))
      );
    }

    // Assemble the first period sub-document for the new tracker doc
    const newPeriodEntry = {
      currentDate,
      bleeding,
      symptoms: symptoms ?? [],
      spotting: spotting ?? [],
      ...(payload.period?.hasOwnProperty("selfTestDate") ? { selfTestDate: payload.period.selfTestDate } : {}),
    };

    // Get the user's most recent period doc to check the inter-period gap
    const latestPeriod = await PeriodTracker.findOne({ userId: payload.userId }).sort({
      createdAt: -1,
    });

    // endDate is only set via recordPeriodEnd — reject if provided here
    if (payload.endDate) {
      return badRequestResponse(
        res,
        "Bad request occurred.",
        "Cannot provide an end date when no period has been started."
      );
    }

    // ── FIRST-EVER PERIOD ─────────────────────────────────────────────────────
    // No prior doc exists; create the initial tracker with an estimated end date
    if (!latestPeriod) {
      const periodDuration = AVERAGE_PERIOD_DURATION;
      const endDate = new Date(currentDate.getTime() + periodDuration * 24 * 60 * 60 * 1000);

      const newRecord = await PeriodTracker.create({
        userId: payload.userId,
        currentDate,
        startDate: currentDate,
        endDate,
        period: [newPeriodEntry],
      });

      return successResponse(
        res,
        newRecord,
        "Period log recorded successfully.",
        "Successfully recorded period log."
      );
    }

    // ── SUBSEQUENT PERIOD ─────────────────────────────────────────────────────
    // Ensure enough days have passed since the last period ended before allowing a new one

    const previousEndDate = new Date(latestPeriod.endDate);

    // Gap in days between the previous period's end and this new start
    const gapInDays = Math.floor((startDate - previousEndDate) / (1000 * 60 * 60 * 24));

    const periodDuration = AVERAGE_PERIOD_DURATION;
    const endDate = new Date(currentDate.getTime() + periodDuration * 24 * 60 * 60 * 1000);

    if (gapInDays >= POST_MENSTRUAL_INTERVAL) {
      // Gap is sufficient — create the new period doc
      const newRecord = await PeriodTracker.create({
        userId: payload.userId,
        currentDate,
        startDate: currentDate,
        endDate,
        period: [newPeriodEntry],
      });

      return successResponse(res, newRecord, "Period created successfully");
    }

    // Gap is too short — reject to prevent back-to-back period entries
    return badRequestResponse(
      res,
      "Frequent period entry detected.",
      "A new period cannot start this soon after the previous one."
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};






















































// ─── RECORD PERIOD END ────────────────────────────────────────────────────────
// Closes the user's most recent active period by setting its endDate.
// Also trims any period[] sub-documents whose currentDate falls after the new endDate
// (handles the case where daily entries were logged beyond what turned out to be the actual end).
export const recordPeriodEnd = async (req, res) => {
  try {
    const payload = req.body;
    const { userId, endDate } = payload;

    // userId is mandatory — all period records are user-scoped
    if (!userId) {
      return badRequestResponse(res, "User not found.", "User ID is required.");
    }

    // endDate is the primary input for this endpoint
    if (!endDate) {
      return badRequestResponse(res, "Bad request occurred.", "End date is required.");
    }

    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedEndDate.getTime())) {
      return badRequestResponse(res, "End date is invalid.", "End date is invalid.");
    }

    // currentDate is required to confirm the request is being made on the same day as the end
    if (!payload.currentDate) {
      return badRequestResponse(res, "Current date is required.", "Current date is required.");
    }

    const currentDate = new Date(payload.currentDate);

    if (Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "Current date is invalid.");
    }

    // Enforce that the period is ended on the day it actually ended —
    // back-dated or future-dated end submissions are rejected
    const isSameDay = currentDate.getUTCFullYear() === parsedEndDate.getUTCFullYear() && currentDate.getUTCMonth() === parsedEndDate.getUTCMonth() && currentDate.getUTCDate() === parsedEndDate.getUTCDate();

    if (!isSameDay) {
      return badRequestResponse(
        res,
        "Current date and end date must be the same.",
        "Current date and end date must be the same."
      );
    }

    // Target only the most recently created period doc for this user
    const latestPeriod = await PeriodTracker.findOne({ userId }).sort({ createdAt: -1 });

    if (!latestPeriod) {
      return notFoundResponse(res, "Period not found.", "No period records found.");
    }

    // endDate must not be earlier than the period's own start date
    if (parsedEndDate < latestPeriod.startDate) {
      return badRequestResponse(
        res,
        "Invalid end date.",
        "End date cannot be earlier than start date."
      );
    }

    // Apply the confirmed end date
    latestPeriod.endDate = parsedEndDate;

    // Trim period[] entries that are now beyond the official end date —
    // keeps the sub-document array consistent with the declared range
    latestPeriod.period = latestPeriod.period.filter((item) => {
      return new Date(item.currentDate) <= parsedEndDate;
    });

    // Update the isEndedByUser flag
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

const getAveragePeriodDuration = (periodDocs) => {
  if (!periodDocs.length) return 0;

  const totalPeriodDuration = periodDocs.reduce(
    (sum, p) => sum + (p.periodDuration || 0),
    0,
  );

  return Math.round(totalPeriodDuration / periodDocs.length);
};

// // ─── Helper: Average cycle length (in days) ──────────────────────────────────
// // Takes the array of period docs (any order) and returns the rounded average
// // gap between consecutive cycle start dates
const getAverageCycleLength = (periodDocs) => {
  const sorted = [...periodDocs].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate),
  );

  console.log("🚀 ~ trackPeriod.js:982 ~ getAverageCycleLength ~ sorted.length:", sorted.length)
  if (sorted.length < 2) return 0;

  let totalCycleDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].startDate);
    const curr = new Date(sorted[i].startDate);
    totalCycleDays += Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
  }

  return Math.round(totalCycleDays / (sorted.length - 1));
};

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
          endDate:   { $exists: true, $ne: null },
        },
        { period: 0 },
      ).sort({ startDate: -1 });

      if (allPeriodDocs.length > 0) {
        const result = {
          estimatedNextPeriodDate: null,
          averageDaysOfPeriods:    null,
          averageCycleLength:      null,
          sixMonthCycleHistory:    [],
        };

        // ── Averages ─────────────────────────────────────────────────────────
        const averageCycleLength     = getAverageCycleLength(allPeriodDocs);
        const averageDaysOfPeriods   = getAveragePeriodDuration(allPeriodDocs);

        result.averageCycleLength   = averageCycleLength;
        result.averageDaysOfPeriods = averageDaysOfPeriods;

        // ── Estimated next period date ───────────────────────────────────────
        const estimatedNextPeriodDate = new Date(allPeriodDocs[0].startDate);
        estimatedNextPeriodDate.setDate(
          estimatedNextPeriodDate.getDate() + averageCycleLength,
        );
        result.estimatedNextPeriodDate = estimatedNextPeriodDate;

        // ── Last 6 months of self-test records ───────────────────────────────
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const selfTests = await UserSelfTest.find(
          { userId, currentDate: { $gte: sixMonthsAgo } },
          { selfTest: 0 },
        )
          .sort({ currentDate: 1 })
          .lean();

        // ── Expand latest 6 periods across month boundaries ──────────────────
        const toMonthName = (d) =>
          d.toLocaleString("en-US", { month: "short" }).toUpperCase();

        const latestSixPeriods = allPeriodDocs.slice(0, 6);

        const expandedPeriods = latestSixPeriods.flatMap((period) => {
          const startDate = new Date(period.startDate);
          const endDate   = new Date(period.endDate);

          // Period fits inside a single calendar month
          if (
            startDate.getMonth()    === endDate.getMonth() &&
            startDate.getFullYear() === endDate.getFullYear()
          ) {
            return [
              {
                monthName: toMonthName(startDate),
                startDate: period.startDate,
                endDate:   period.endDate,
              },
            ];
          }

          // Period spans multiple months — split into per-month segments
          const segments = [];
          let cursor = new Date(startDate);

          while (
            cursor.getMonth()    !== endDate.getMonth() ||
            cursor.getFullYear() !== endDate.getFullYear()
          ) {
            const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
            segments.push({
              monthName: toMonthName(cursor),
              startDate: new Date(cursor),
              endDate:   new Date(monthEnd),
            });
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
          }

          // Final segment (the month that contains endDate)
          segments.push({
            monthName: toMonthName(endDate),
            startDate: new Date(cursor),
            endDate:   new Date(endDate),
          });

          return segments;
        });

        // ── Attach self-test dates to their matching months ──────────────────
        const periodSelfTests = expandedPeriods.flatMap((period) => {
          const matchingSelfTests = selfTests.filter((selfTest) => {
            const monthName = new Date(selfTest.currentDate)
              .toLocaleString("en-US", { month: "short" })
              .toUpperCase();
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

        return successResponse(
          res,
          result,
          "Period insights generated successfully.",
          "Successfully generated period insights.",
        );
      }
    } catch (error) {
      return somethingWentWrong(
        res,
        error,
        "Something went wrong while fetching period data.",
      );
    }

    // ─── Branch B: fallback — user has legacy period[] array docs ────────────
    const POST_MENSTRUAL_INTERVAL = Number(
      process.env.POST_MENSTRUAL_INTERVAL || 10,
    );

    const periodDocs = await PeriodTracker.find({ userId }).sort({ createdAt: 1 });

    const allPeriods = periodDocs
      .flatMap((doc) => doc.period || [])
      .map((p) => ({ ...p, date: new Date(p.date) }))
      .sort((a, b) => a.date - b.date);

    if (!allPeriods.length) {
      return successResponse(
        res,
        { cycles: [] },
        "No period data found.",
        "Empty dataset.",
      );
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
      const endDate   = cycle[cycle.length - 1].date;

      const cycleDuration    = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
      const bleedingDuration = cycle.filter((d) => d?.bleeding?.flowLevel >= 1).length;
      const symptomFrequency = cycle.reduce(
        (acc, day) => acc + (day.symptoms?.length || 0),
        0,
      );

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
      { totalCycles: cycles.length, cycleInsights },
      "Cycle insights generated successfully.",
      "Insights computed successfully.",
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(
      res,
      error,
      "Something went wrong while generating insights.",
    );
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

    return successResponse(res, periodDocs, "All period data is fetched.", "All period data is fetched successfully.");
  } catch (error) {
    return somethingWentWrong(res, error, "Something went wrong while fetching period data.");
  }
};

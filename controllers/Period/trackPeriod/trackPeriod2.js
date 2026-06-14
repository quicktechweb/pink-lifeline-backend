import {
  badRequestResponse,
  isValidNewPeriodGap,
  isWithinSamePeriod,
  notFoundResponse,
  successResponse,
  getBleedingTitle,
  getSpottingTitle,
  getSymptomTitle,
} from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
import { AVERAGE_PERIOD_DURATION, POST_MENSTRUAL_INTERVAL } from "../../../constant/constant.js";

// ─── ENV / CONSTANT GUARDS ────────────────────────────────────────────────────
// MAX_PERIOD_DURATION: a single cycle cannot exceed this many days.
// Anything beyond is physiologically unusual and likely a data entry mistake.
const MAX_PERIOD_DURATION = parseInt(process.env.MAX_PERIOD_DURATION) || 10;

// MAX_EXTEND_DAYS: how many days past the estimated endDate the user can still
// log daily entries without explicitly starting a new period.
// Flo allows ~2-3 days of "late flow" before treating it as a new cycle.
const MAX_EXTEND_DAYS = parseInt(process.env.MAX_EXTEND_DAYS) || 3;


// ─── RECORD PERIOD LOG ────────────────────────────────────────────────────────
//
// Single unified endpoint — handles four distinct flows based on what
// the client sends in the payload:
//
//  A) Brand-new user (no history at all)
//     → Create first ever cycle doc
//
//  B) payload.startDate present  → Explicit new cycle start
//     → Validate gap from last cycle, close any orphaned open cycle, create new doc
//
//  C) payload.endDate present  → Explicit cycle close
//     → Validate, trim future pre-filled entries, mark isEndedByUser = true
//
//  D) Neither startDate nor endDate  → Daily log within active cycle
//     → Upsert the day entry (update in-place if same date, push if new date)
//     → Auto-extend endDate if logging past estimated end (within MAX_EXTEND_DAYS)
//     → Auto-close + start new cycle if gap is too large (Flo behaviour)
//
// Request body shape is never changed — only the logic inside is hardened.
// ─────────────────────────────────────────────────────────────────────────────
export const recordPeriodLog = async (req, res) => {
  try {
    const payload = req.body;

    // ── 1. USER VALIDATION ────────────────────────────────────────────────────
    if (!payload.userId) {
      return notFoundResponse(res, "User not found.", "User ID is missing.");
    }

    const isUserExist = await User.findOne({ userId: payload.userId });
    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    // ── 2. DATE VALIDATION ────────────────────────────────────────────────────
    if (!payload.currentDate) {
      return badRequestResponse(res, "Bad request occurred.", "Current date is required.");
    }

    const currentDate = parseAsUTCDateOnly(payload.currentDate);
    if (!currentDate || Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "currentDate must be a valid date string.");
    }

    if (currentDate.getTime() > todayUTC().getTime()) {
      return badRequestResponse(res, "Current date cannot be in the future.", "currentDate cannot be a future date.");
    }

    // ── 3. PERIOD DATA VALIDATION ─────────────────────────────────────────────
    if (
      !payload.period?.bleeding &&
      !payload.period?.spotting?.length &&
      !payload.period?.symptoms?.length
    ) {
      return badRequestResponse(
        res,
        "Bad request occurred.",
        "At least one of bleeding, spotting, or symptoms is required."
      );
    }

    // startDate + endDate together is ambiguous — reject early
    if (payload.startDate && payload.endDate) {
      return badRequestResponse(
        res,
        "Bad request occurred.",
        "startDate and endDate cannot be provided together."
      );
    }

    // flowLevel must be 0-3 (0 = no flow, 1-3 = light/medium/heavy)
    const rawFlow = payload.period?.bleeding?.flowLevel;
    if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
      return badRequestResponse(res, "Invalid flow level.", "flowLevel must be 0, 1, 2, or 3.");
    }

    // ── 4. RESOLVE TITLES ─────────────────────────────────────────────────────
    // Title comes from the payload if already present (mobile cache),
    // otherwise fetched from the dropdowns collection.
    const bleedingTitle =
      payload.period?.bleeding?.title ||
      (payload.period?.bleeding?._id
        ? await getBleedingTitle(payload.period.bleeding._id)
        : null);

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

    // ── 5. BUILD NEW PERIOD ENTRY ─────────────────────────────────────────────
    const newPeriodEntry = {
      currentDate,
      bleeding,
      symptoms,
      spotting,
      ...(payload.period?.hasOwnProperty("selfTestDate")
        ? { selfTestDate: payload.period.selfTestDate }
        : {}),
    };

    // ── 6. FETCH EXISTING HISTORY ─────────────────────────────────────────────
    // Pull last 6 completed cycles for duration averaging (lean for perf).
    // Also pull the single latest cycle doc separately for live state checks.
    const [latestCycle, recentCycles] = await Promise.all([
      PeriodTracker.findOne({ userId: payload.userId }).sort({ createdAt: -1 }),
      PeriodTracker.find({
        userId:        payload.userId,
        startDate:     { $ne: null },
        endDate:       { $ne: null },
        isEndedByUser: true,
      })
        .sort({ startDate: -1 })
        .limit(6)
        .lean(),
    ]);

    // ── 7. COMPUTE PERSONALISED PERIOD DURATION ───────────────────────────────
    // Average of past confirmed cycle lengths, clamped to [1, MAX_PERIOD_DURATION].
    // Falls back to AVERAGE_PERIOD_DURATION constant if no history exists.
    let periodDuration = AVERAGE_PERIOD_DURATION;

    if (recentCycles.length > 0) {
      const durations = recentCycles.map((c) => {
        const days = Math.round(
          (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;
        return days;
      });
      const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
      periodDuration = Math.min(Math.max(avg, 1), MAX_PERIOD_DURATION);
    }

    // ── HELPER: build pre-fill entries for all days of a new cycle ───────────
    // Day 0 = the actual user entry with full payload data.
    // Days 1..N = copies of today's full entry (bleeding + symptoms + spotting)
    // shifted to their respective dates. User can update any day later via
    // daily log (Flow D upsert will overwrite in place).
    const buildPrefillEntries = (firstEntry, fromDate, duration) => {
      const entries = [firstEntry];
      for (let i = 1; i < duration; i++) {
        const d = new Date(fromDate);
        d.setUTCDate(d.getUTCDate() + i);
        entries.push({
          ...newPeriodEntry,       // copies bleeding, symptoms, spotting from today
          currentDate: d,          // overwrite with the correct future date
        });
      }
      return entries;
    };

    // ── HELPER: upsert a day entry inside an existing cycle doc ──────────────
    // If an entry for currentDate already exists -> $set in-place (no duplicate).
    // If not -> $push a new entry.
    // Also updates the cycle's top-level currentDate stamp.
    const upsertDayEntry = async (cycleDoc, extraSetFields = {}) => {
      const currentDateStr = toDateOnly(currentDate);

      const existingIndex = cycleDoc.period.findIndex(
        (p) => toDateOnly(p.currentDate) === currentDateStr
      );

      if (existingIndex !== -1) {
        return PeriodTracker.findByIdAndUpdate(
          cycleDoc._id,
          {
            $set: {
              [`period.${existingIndex}`]: newPeriodEntry,
              currentDate,
              ...extraSetFields,
            },
          },
          { new: true }
        );
      }

      return PeriodTracker.findByIdAndUpdate(
        cycleDoc._id,
        {
          $push: { period: newPeriodEntry },
          $set:  { currentDate, ...extraSetFields },
        },
        { new: true }
      );
    };

    // =========================================================================
    // FLOW A — BRAND-NEW USER (zero history)
    // =========================================================================
    if (!latestCycle) {
      if (payload.endDate) {
        return badRequestResponse(
          res,
          "Bad request occurred.",
          "Cannot provide an endDate when no period has been started."
        );
      }

      const startDate  = payload.startDate ? parseAsUTCDateOnly(payload.startDate) : currentDate;
      const estEndDate = new Date(startDate);
      estEndDate.setUTCDate(estEndDate.getUTCDate() + (periodDuration - 1));

      const prefillEntries = buildPrefillEntries(newPeriodEntry, startDate, periodDuration);

      const newRecord = await PeriodTracker.create({
        userId:        payload.userId,
        currentDate,
        startDate,
        endDate:       estEndDate,
        isEndedByUser: false,
        period:        prefillEntries,
      });

      return successResponse(
        res,
        newRecord,
        "Period log recorded successfully.",
        "Successfully recorded period log."
      );
    }

    // =========================================================================
    // FLOW B — EXPLICIT NEW CYCLE START  (payload.startDate present)
    // =========================================================================
    if (payload.startDate) {
      const newStartDate = parseAsUTCDateOnly(payload.startDate);
      if (!newStartDate || Number.isNaN(newStartDate.getTime())) {
        return badRequestResponse(res, "Start date is invalid.", "startDate must be a valid date string.");
      }

      // currentDate must equal startDate — you can only open a cycle on the day it begins
      if (currentDate.getTime() !== newStartDate.getTime()) {
        return badRequestResponse(
          res,
          "Invalid request.",
          "currentDate and startDate must be the same — you can only start a period on today's date."
        );
      }

      // Block if the last cycle is still open and its estimated end hasn't passed
      if (!latestCycle.isEndedByUser) {
        const latestEstEnd = parseAsUTCDateOnly(latestCycle.endDate);
        if (latestEstEnd && currentDate.getTime() <= latestEstEnd.getTime()) {
          return badRequestResponse(
            res,
            "Active period already exists.",
            "You have an ongoing period that hasn't ended yet. Please end it before starting a new one."
          );
        }
        // Estimated end has passed but user never closed it — auto-close (Flo behaviour)
        await PeriodTracker.findByIdAndUpdate(latestCycle._id, {
          endDate:       parseAsUTCDateOnly(latestCycle.currentDate),
          isEndedByUser: false,
        });
      }

      // Gap check: new startDate vs previous cycle's endDate
      const prevEndDate = parseAsUTCDateOnly(latestCycle.endDate) ?? parseAsUTCDateOnly(latestCycle.currentDate);
      const gapDays = Math.floor(
        (newStartDate.getTime() - prevEndDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (gapDays < POST_MENSTRUAL_INTERVAL) {
        return badRequestResponse(
          res,
          "Frequent period entry detected.",
          `A new period cannot start within ${POST_MENSTRUAL_INTERVAL} days of the previous one ending. Current gap: ${gapDays} day(s).`
        );
      }

      // Overlap check: new startDate must not land inside any existing cycle window
      const allCycles = await PeriodTracker.find({ userId: payload.userId }).lean();
      const overlapping = allCycles.find((c) => {
        const cs = parseAsUTCDateOnly(c.startDate);
        const ce = parseAsUTCDateOnly(c.endDate);
        return cs && ce &&
          newStartDate.getTime() >= cs.getTime() &&
          newStartDate.getTime() <= ce.getTime();
      });

      if (overlapping) {
        return badRequestResponse(
          res,
          "Invalid period date.",
          "The start date overlaps with an existing recorded period cycle."
        );
      }

      const estEndDate = new Date(newStartDate);
      estEndDate.setUTCDate(estEndDate.getUTCDate() + (periodDuration - 1));

      const prefillEntries = buildPrefillEntries(newPeriodEntry, newStartDate, periodDuration);

      const newRecord = await PeriodTracker.create({
        userId:        payload.userId,
        currentDate,
        startDate:     newStartDate,
        endDate:       estEndDate,
        isEndedByUser: false,
        period:        prefillEntries,
      });

      return successResponse(
        res,
        newRecord,
        "New period started and log recorded successfully.",
        "Successfully recorded period log."
      );
    }

    // =========================================================================
    // FLOW C — EXPLICIT CYCLE END  (payload.endDate present)
    // =========================================================================
    if (payload.endDate) {
      const parsedEndDate = parseAsUTCDateOnly(payload.endDate);
      if (!parsedEndDate || Number.isNaN(parsedEndDate.getTime())) {
        return badRequestResponse(res, "End date is invalid.", "endDate must be a valid date string.");
      }

      // currentDate must equal endDate
      if (currentDate.getTime() !== parsedEndDate.getTime()) {
        return badRequestResponse(
          res,
          "Invalid request.",
          "currentDate and endDate must be the same — you can only end a period on today's date."
        );
      }

      // Must have an open cycle to close
      if (latestCycle.isEndedByUser) {
        return badRequestResponse(
          res,
          "Bad request occurred.",
          "No open period found to close. Please start a new period first."
        );
      }

      const cycleStart    = parseAsUTCDateOnly(latestCycle.startDate);
      const endDateOnly   = toDateOnly(parsedEndDate);
      const startDateOnly = toDateOnly(cycleStart);

      // endDate must not be before startDate
      if (endDateOnly < startDateOnly) {
        return badRequestResponse(
          res,
          "Invalid end date.",
          `endDate (${endDateOnly}) cannot be earlier than the cycle start date (${startDateOnly}).`
        );
      }

      // endDate must not exceed MAX_PERIOD_DURATION from startDate
      const cycleLengthDays =
        Math.floor((parsedEndDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (cycleLengthDays > MAX_PERIOD_DURATION) {
        return badRequestResponse(
          res,
          "Invalid end date.",
          `A period cannot last more than ${MAX_PERIOD_DURATION} days. This cycle would be ${cycleLengthDays} day(s). If bleeding has continued this long, please consult a healthcare provider.`
        );
      }

      // Cannot end before the last entry the user already logged
      const loggedDates  = latestCycle.period.map((p) => toDateOnly(p.currentDate));
      const latestLogged = loggedDates.sort().at(-1);
      if (latestLogged && endDateOnly < latestLogged) {
        return badRequestResponse(
          res,
          "Invalid end date.",
          `You have entries logged as late as ${latestLogged}. The end date cannot be earlier than your last logged entry.`
        );
      }

      // Upsert today's entry + close the cycle in one shot
      await upsertDayEntry(latestCycle, {
        endDate:       parsedEndDate,
        isEndedByUser: true,
      });

      // Trim pre-filled skeleton entries that fall after the confirmed endDate
      await PeriodTracker.findByIdAndUpdate(latestCycle._id, {
        $pull: { period: { currentDate: { $gt: parsedEndDate } } },
      });

      const finalRecord = await PeriodTracker.findById(latestCycle._id);

      return successResponse(
        res,
        finalRecord,
        "Period ended and log recorded successfully.",
        "Successfully recorded period log."
      );
    }

    // =========================================================================
    // FLOW D — DAILY LOG  (no startDate, no endDate)
    // =========================================================================

    // D-1. Active open cycle — check if currentDate is still within its window
    if (!latestCycle.isEndedByUser) {
      const cycleStart = parseAsUTCDateOnly(latestCycle.startDate);
      const cycleEnd   = parseAsUTCDateOnly(latestCycle.endDate);

      const maxAllowed = new Date(cycleEnd);
      maxAllowed.setUTCDate(maxAllowed.getUTCDate() + MAX_EXTEND_DAYS);

      // currentDate is before the cycle even started — reject
      if (currentDate.getTime() < cycleStart.getTime()) {
        return badRequestResponse(
          res,
          "Date not allowed.",
          `Cannot log a day before the period start date (${toDateOnly(cycleStart)}).`
        );
      }

      if (currentDate.getTime() <= maxAllowed.getTime()) {
        // Within window (including extension buffer) — upsert the day entry.
        // If logging past the estimated end, extend endDate forward.
        const extraSet =
          currentDate.getTime() > cycleEnd.getTime()
            ? { endDate: currentDate }
            : {};

        const updatedRecord = await upsertDayEntry(latestCycle, extraSet);

        return successResponse(
          res,
          updatedRecord,
          "Period log recorded successfully.",
          "Successfully recorded period log."
        );
      }

      // currentDate is beyond MAX_EXTEND_DAYS past estimated end.
      // Flo behaviour: auto-close the previous cycle, start a new one implicitly.
      await PeriodTracker.findByIdAndUpdate(latestCycle._id, {
        endDate:       parseAsUTCDateOnly(latestCycle.currentDate),
        isEndedByUser: false,
      });

      const newEstEnd = new Date(currentDate);
      newEstEnd.setUTCDate(newEstEnd.getUTCDate() + (periodDuration - 1));

      const prefillEntries = buildPrefillEntries(newPeriodEntry, currentDate, periodDuration);

      const newRecord = await PeriodTracker.create({
        userId:        payload.userId,
        currentDate,
        startDate:     currentDate,
        endDate:       newEstEnd,
        isEndedByUser: false,
        period:        prefillEntries,
      });

      return successResponse(
        res,
        newRecord,
        "Period log recorded successfully.",
        "Previous period auto-closed. New period started."
      );
    }

    // D-2. Previous cycle is closed — check gap before allowing implicit new cycle
    const prevEndDate = parseAsUTCDateOnly(latestCycle.endDate);
    const gapDays = Math.floor(
      (currentDate.getTime() - prevEndDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (gapDays < POST_MENSTRUAL_INTERVAL) {
      return badRequestResponse(
        res,
        "Frequent period entry detected.",
        `A new period cannot start within ${POST_MENSTRUAL_INTERVAL} days of the previous one ending. Current gap: ${gapDays} day(s). If you believe this is correct, please consult a healthcare provider.`
      );
    }

    // Gap is sufficient — implicitly start a new cycle
    const newEstEnd = new Date(currentDate);
    newEstEnd.setUTCDate(newEstEnd.getUTCDate() + (periodDuration - 1));

    const prefillEntries = buildPrefillEntries(newPeriodEntry, currentDate, periodDuration);

    const newRecord = await PeriodTracker.create({
      userId:        payload.userId,
      currentDate,
      startDate:     currentDate,
      endDate:       newEstEnd,
      isEndedByUser: false,
      period:        prefillEntries,
    });

    return successResponse(
      res,
      newRecord,
      "Period log recorded successfully.",
      "Successfully recorded period log."
    );

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─── SHARED VALIDATOR ─────────────────────────────────────────────────────────
const validateRecordPeriodData = async (res, payload) => {
  if (!payload.userId) {
    notFoundResponse(res, "User not found.", "User ID is missing.");
    return false;
  }

  const isUserExist = await User.findOne({ userId: payload.userId });
  if (!isUserExist) {
    notFoundResponse(res, "User not found.", "User is not registered.");
    return false;
  }

  if (!payload.currentDate) {
    badRequestResponse(res, "Bad request occurred.", "Current date is required.");
    return false;
  }

  if (
    !payload.period?.bleeding &&
    !payload.period?.spotting?.length &&
    !payload.period?.symptoms?.length
  ) {
    badRequestResponse(res, "Bad request occurred.", "At least one of bleeding, spotting, or symptoms is required.");
    return false;
  }

  if (payload.startDate && payload.endDate) {
    badRequestResponse(res, "Bad request occurred.", "startDate and endDate cannot be provided together.");
    return false;
  }

  return true;
};


// ─── DATE UTILITIES ───────────────────────────────────────────────────────────

const parseAsUTCDateOnly = (dateStr) => {
  if (!dateStr) return null;
  // If it's already a Date object, use toISOString() — not toString()
  const iso = dateStr instanceof Date
    ? dateStr.toISOString()
    : dateStr.toString();
  const datePart = iso.split("T")[0];
  return new Date(datePart + "T00:00:00.000Z");
};

const todayUTC = () => {
  const now = new Date();
  return new Date(now.toISOString().split("T")[0] + "T00:00:00.000Z");
};

const toDateOnly = (date) =>{ 
    return  new Date(date).toISOString().split("T")[0]; 
}


// ─── ANALYTICS HELPERS ────────────────────────────────────────────────────────

const getAveragePeriodDuration = (periodDocs) => {
  if (!periodDocs.length) return 0;
  const total = periodDocs.reduce((sum, p) => sum + (p.periodDuration || 0), 0);
  return Math.round(total / periodDocs.length);
};

const getAverageCycleLength = (periodDocs) => {
  const sorted = [...periodDocs].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  if (sorted.length < 2) return 0;

  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].startDate);
    const curr = new Date(sorted[i].startDate);
    totalDays += Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
  }
  return Math.round(totalDays / (sorted.length - 1));
};


// ─── SHARED PERIOD DURATION RESOLVER ─────────────────────────────────────────
// Used by all three dedicated functions below.
// Pulls last 6 user-confirmed cycles, averages their lengths,
// clamps to [1, MAX_PERIOD_DURATION]. Falls back to AVERAGE_PERIOD_DURATION.
const resolvePersonalisedDuration = async (userId) => {
  const recentCycles = await PeriodTracker.find({
    userId,
    startDate:     { $ne: null },
    endDate:       { $ne: null },
    isEndedByUser: true,
  })
    .sort({ startDate: -1 })
    .limit(6)
    .lean();

  if (!recentCycles.length) return AVERAGE_PERIOD_DURATION;

  const durations = recentCycles.map((c) =>
    Math.round(
      (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
  const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
  return Math.min(Math.max(avg, 1), MAX_PERIOD_DURATION);
};


// ─── SHARED PERIOD ENTRY BUILDER ──────────────────────────────────────────────
// Resolves titles and builds the newPeriodEntry + bleeding objects
// from the raw payload. Used identically by all three dedicated functions.
const buildEntryFromPayload = async (payload, currentDate) => {
  const rawFlow = payload.period?.bleeding?.flowLevel;
  if (rawFlow !== undefined && ![0, 1, 2, 3].includes(rawFlow)) {
    return { error: "flowLevel must be 0, 1, 2, or 3." };
  }

  const bleedingTitle =
    payload.period?.bleeding?.title ||
    (payload.period?.bleeding?._id
      ? await getBleedingTitle(payload.period.bleeding._id)
      : null);

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

  return { bleeding, bleedingTitle, symptoms, spotting, newPeriodEntry };
};


// ─── SHARED PREFILL BUILDER ───────────────────────────────────────────────────
// Copies today's full entry (bleeding + symptoms + spotting) forward
// for every day of the estimated cycle duration.
// User can overwrite any day later via recordPeriodCurrent (upsert in-place).
const buildPrefillEntries = (firstEntry, fromDate, duration) => {
  const entries = [firstEntry];
  for (let i = 1; i < duration; i++) {
    const d = new Date(fromDate);
    d.setUTCDate(d.getUTCDate() + i);
    entries.push({
      ...firstEntry,   // full copy of today: bleeding, symptoms, spotting
      currentDate: d,  // overwrite with the correct shifted date
    });
  }
  return entries;
};





























// ─── RECORD PERIOD START ──────────────────────────────────────────────────────
// Creates a brand-new cycle document.
// currentDate must equal startDate (you can only open a cycle today).
// Pre-fills period[] with today's full data copied to every estimated day.
export const recordPeriodStart = async (req, res) => {
  try {
    const payload = req.body;

    // ── 1. User ───────────────────────────────────────────────────────────────
    if (!payload.userId) {
      return notFoundResponse(res, "User not found.", "User ID is missing.");
    }
    const isUserExist = await User.findOne({ userId: payload.userId });
    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    // ── 2. startDate ──────────────────────────────────────────────────────────
    if (!payload.startDate) {
      return badRequestResponse(res, "Start date is required.", "startDate is required.");
    }
    const startDate = parseAsUTCDateOnly(payload.startDate);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      return badRequestResponse(res, "Start date is invalid.", "startDate must be a valid date string.");
    }

    // ── 3. currentDate — falls back to startDate for backdated entries ────────
    const currentDate = payload.currentDate
      ? parseAsUTCDateOnly(payload.currentDate)
      : startDate;

    if (!currentDate || Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "currentDate must be a valid date string.");
    }

    // currentDate must match startDate — you log the day you open the cycle
    if (currentDate.getTime() !== startDate.getTime()) {
      return badRequestResponse(
        res,
        "Invalid request.",
        "currentDate and startDate must be the same — you can only start a period on today's date."
      );
    }

    // startDate cannot be in the future
    if (startDate.getTime() > todayUTC().getTime()) {
      return badRequestResponse(
        res,
        "Invalid start date.",
        "startDate cannot be a future date."
      );
    }

    // endDate must NOT be provided — it is estimated automatically
    if (payload.endDate) {
      return badRequestResponse(
        res,
        "Bad request occurred.",
        "Do not provide endDate when starting a new period. It will be estimated automatically."
      );
    }

    // ── 4. Period data ────────────────────────────────────────────────────────
    if (
      !payload.period?.bleeding &&
      !payload.period?.spotting?.length &&
      !payload.period?.symptoms?.length
    ) {
      return badRequestResponse(
        res,
        "Bad request occurred.",
        "At least one of bleeding, spotting, or symptoms is required."
      );
    }

    // ── 5. Build entry ────────────────────────────────────────────────────────
    const built = await buildEntryFromPayload(payload, currentDate);
    if (built.error) {
      return badRequestResponse(res, "Invalid flow level.", built.error);
    }
    const { newPeriodEntry } = built;

    // ── 6. Fetch all cycles for gap / overlap / conflict checks ───────────────
    const allCycles = await PeriodTracker.find({ userId: payload.userId })
      .sort({ startDate: 1 })
      .lean();

    if (allCycles.length) {
      // Find the cycle immediately BEFORE the new startDate (chronologically)
      const prevCycle = [...allCycles]
        .reverse()
        .find((c) => parseAsUTCDateOnly(c.startDate).getTime() < startDate.getTime());

      // Find the cycle immediately AFTER the new startDate (chronologically)
      const nextCycle = allCycles
        .find((c) => parseAsUTCDateOnly(c.startDate).getTime() > startDate.getTime());

      // ── Gap check vs previous cycle's end ────────────────────────────────
      if (prevCycle) {
        const prevEnd =
          parseAsUTCDateOnly(prevCycle.endDate) ??
          parseAsUTCDateOnly(prevCycle.currentDate);

        const gapDays = Math.floor(
          (startDate.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (gapDays < POST_MENSTRUAL_INTERVAL) {
          return badRequestResponse(
            res,
            "Frequent period entry detected.",
            `A new period cannot start within ${POST_MENSTRUAL_INTERVAL} days of the previous one ending. Current gap: ${gapDays} day(s).`
          );
        }
      }

      // ── Gap check vs next cycle's start ──────────────────────────────────
      if (nextCycle) {
        const nextStart = parseAsUTCDateOnly(nextCycle.startDate);
        const gapToNext = Math.floor(
          (nextStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (gapToNext < POST_MENSTRUAL_INTERVAL) {
          return badRequestResponse(
            res,
            "Frequent period entry detected.",
            `The next recorded period starts too soon after this date. Gap: ${gapToNext} day(s).`
          );
        }
      }

      // ── Block if startDate falls inside an open (unended) cycle window ────
      const conflictingOpenCycle = allCycles.find((c) => {
        if (c.isEndedByUser) return false;
        const cs = parseAsUTCDateOnly(c.startDate);
        const ce = parseAsUTCDateOnly(c.endDate);
        return (
          cs && ce &&
          startDate.getTime() >= cs.getTime() &&
          startDate.getTime() <= ce.getTime()
        );
      });
      if (conflictingOpenCycle) {
        return badRequestResponse(
          res,
          "Active period already exists.",
          "The start date falls within an ongoing period that hasn't ended yet. Please end it before starting a new one."
        );
      }

      // ── Overlap check vs all cycle windows (including closed ones) ────────
      const overlapping = allCycles.find((c) => {
        const cs = parseAsUTCDateOnly(c.startDate);
        const ce = parseAsUTCDateOnly(c.endDate);
        return (
          cs && ce &&
          startDate.getTime() >= cs.getTime() &&
          startDate.getTime() <= ce.getTime()
        );
      });
      if (overlapping) {
        return badRequestResponse(
          res,
          "Invalid period date.",
          "The start date overlaps with an existing recorded period cycle."
        );
      }
    }

    // ── 7. Compute personalised duration & estimated endDate ──────────────────
    const periodDuration = await resolvePersonalisedDuration(payload.userId);
    const estEndDate = new Date(startDate);
    estEndDate.setUTCDate(estEndDate.getUTCDate() + (periodDuration - 1));

    // ── 8. Pre-fill: copy today's full entry to every cycle day ───────────────
    const prefillEntries = buildPrefillEntries(newPeriodEntry, startDate, periodDuration);

    // ── 9. Save ───────────────────────────────────────────────────────────────
    const newRecord = await PeriodTracker.create({
      userId:        payload.userId,
      currentDate,
      startDate,
      endDate:       estEndDate,
      isEndedByUser: false,
      period:        prefillEntries,
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
// Updates a single day's entry within the active cycle.
// Upserts in-place if the date already exists (no duplicate push).
// Allows logging up to MAX_EXTEND_DAYS past the estimated endDate.
export const recordPeriodCurrent = async (req, res) => {
  try {
    const payload = req.body;

    // ── 1. User ───────────────────────────────────────────────────────────────
    if (!payload.userId) {
      return notFoundResponse(res, "User not found.", "User ID is missing.");
    }
    const isUserExist = await User.findOne({ userId: payload.userId });
    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    // ── 2. currentDate ────────────────────────────────────────────────────────
    if (!payload.currentDate) {
      return badRequestResponse(res, "Bad request occurred.", "currentDate is required.");
    }
    const currentDate = parseAsUTCDateOnly(payload.currentDate);
    if (!currentDate || Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "currentDate must be a valid date string.");
    }
    if (currentDate.getTime() > todayUTC().getTime()) {
      return badRequestResponse(res, "Current date cannot be in the future.", "currentDate cannot be a future date.");
    }

    // ── 3. Period data ────────────────────────────────────────────────────────
    if (
      !payload.period?.bleeding &&
      !payload.period?.spotting?.length &&
      !payload.period?.symptoms?.length
    ) {
      return badRequestResponse(
        res,
        "Bad request occurred.",
        "At least one of bleeding, spotting, or symptoms is required."
      );
    }

    // ── 4. Build entry ────────────────────────────────────────────────────────
    const built = await buildEntryFromPayload(payload, currentDate);
    if (built.error) {
      return badRequestResponse(res, "Invalid flow level.", built.error);
    }
    const { newPeriodEntry } = built;

    // ── 5. Find the cycle that owns this date ─────────────────────────────────
    // Most recent cycle whose startDate <= currentDate
    const matchedCycle = await PeriodTracker.findOne({
      userId:    payload.userId,
      startDate: { $lte: currentDate },
    }).sort({ startDate: -1 });

    if (!matchedCycle) {
      return badRequestResponse(
        res,
        "No active period found.",
        "No period cycle found for this date. Please start a period first."
      );
    }

    // ── 6. Date window check ──────────────────────────────────────────────────
    const cycleStart  = parseAsUTCDateOnly(matchedCycle.startDate);
    const cycleEnd    = parseAsUTCDateOnly(matchedCycle.endDate);
    const maxAllowed  = new Date(cycleEnd);
    maxAllowed.setUTCDate(maxAllowed.getUTCDate() + MAX_EXTEND_DAYS);

    if (currentDate.getTime() < cycleStart.getTime()) {
      return badRequestResponse(
        res,
        "Date not allowed.",
        `Cannot update a day before the period start date (${toDateOnly(cycleStart)}).`
      );
    }
    if (currentDate.getTime() > maxAllowed.getTime()) {
      return badRequestResponse(
        res,
        "Date not allowed.",
        `Cannot update a day more than ${MAX_EXTEND_DAYS} day(s) past the estimated period end (${toDateOnly(cycleEnd)}). Please end this period and start a new one.`
      );
    }

    // Block updates past confirmed end on an already-closed cycle
    if (matchedCycle.isEndedByUser) {
      const confirmedEnd = parseAsUTCDateOnly(matchedCycle.endDate);
      if (currentDate.getTime() > confirmedEnd.getTime()) {
        return badRequestResponse(
          res,
          "Period already ended.",
          "This cycle has been closed. Start a new period to continue logging."
        );
      }
    }

    // ── 7. Upsert: update existing entry OR push new one ──────────────────────
    const currentDateStr  = toDateOnly(currentDate);
    const existingIndex   = matchedCycle.period.findIndex(
      (p) => toDateOnly(p.currentDate) === currentDateStr
    );

    // Only extend endDate if currentDate goes beyond current estimated end
    const extraSet =
      currentDate.getTime() > cycleEnd.getTime()
        ? { endDate: currentDate }
        : {};

    let updatedCycle;

    if (existingIndex !== -1) {
      updatedCycle = await PeriodTracker.findByIdAndUpdate(
        matchedCycle._id,
        {
          $set: {
            [`period.${existingIndex}`]: newPeriodEntry,
            currentDate,
            ...extraSet,
          },
        },
        { new: true }
      );
    } else {
      updatedCycle = await PeriodTracker.findByIdAndUpdate(
        matchedCycle._id,
        {
          $push: { period: newPeriodEntry },
          $set:  { currentDate, ...extraSet },
        },
        { new: true }
      );
    }

    return successResponse(
      res,
      updatedCycle,
      "Period updated successfully.",
      "Period updated successfully."
    );
  } catch (error) {
    console.error(error);
    return badRequestResponse(res, "Bad request occurred.", error.message);
  }
};


































































// ─── RECORD PERIOD END ────────────────────────────────────────────────────────
// Closes the active cycle by confirming its endDate.
// currentDate must equal endDate (you end a period on the day you confirm it).
// Trims any pre-filled entries that fall after the confirmed endDate.
// Marks isEndedByUser = true so recordPeriodStart can detect a clean slate.
export const recordPeriodEnd = async (req, res) => {
  try {
    const payload = req.body;
    const { userId, endDate } = payload;

    // ── 1. User ───────────────────────────────────────────────────────────────
    if (!userId) {
      return notFoundResponse(res, "User not found.", "userId is required.");
    }
    const isUserExist = await User.findOne({ userId });
    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    // ── 2. endDate ────────────────────────────────────────────────────────────
    if (!endDate) {
      return badRequestResponse(res, "Bad request occurred.", "endDate is required.");
    }
    const parsedEndDate = parseAsUTCDateOnly(endDate);
    if (!parsedEndDate || Number.isNaN(parsedEndDate.getTime())) {
      return badRequestResponse(res, "End date is invalid.", "endDate must be a valid date string.");
    }

    // ── 3. currentDate ────────────────────────────────────────────────────────
    if (!payload.currentDate) {
      return badRequestResponse(res, "Bad request occurred.", "currentDate is required.");
    }
    const currentDate = parseAsUTCDateOnly(payload.currentDate);
    if (!currentDate || Number.isNaN(currentDate.getTime())) {
      return badRequestResponse(res, "Current date is invalid.", "currentDate must be a valid date string.");
    }
    if (currentDate.getTime() > todayUTC().getTime()) {
      return badRequestResponse(res, "Current date cannot be in the future.", "currentDate cannot be a future date.");
    }
    if (currentDate.getTime() !== parsedEndDate.getTime()) {
      return badRequestResponse(
        res,
        "Current date and end date must be the same.",
        "currentDate and endDate must match — you can only end a period on today's date."
      );
    }

    // ── 4. Period data (optional on end — user may just be closing) ───────────
    const hasPeriodData =
      payload.period?.bleeding ||
      payload.period?.spotting?.length ||
      payload.period?.symptoms?.length;

    // ── 5. Fetch active cycle ─────────────────────────────────────────────────
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

    // ── 6. endDate >= startDate ───────────────────────────────────────────────
    const cycleStart    = parseAsUTCDateOnly(latestPeriod.startDate);
    const endDateOnly   = toDateOnly(parsedEndDate);
    
    const startDateOnly = toDateOnly(cycleStart);

    if (endDateOnly < startDateOnly) {
        

      return badRequestResponse(
        res,
        "Invalid end date.",
        `endDate (${endDateOnly}) cannot be earlier than the cycle start date (${startDateOnly}).`
      );
    }

    // ── 7. Cycle length cap ───────────────────────────────────────────────────
    const cycleLengthDays = Math.floor((parsedEndDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;


    if (cycleLengthDays > MAX_PERIOD_DURATION) {
      return badRequestResponse(
        res,
        "Invalid end date.",
        `A period cannot last more than ${MAX_PERIOD_DURATION} days. This cycle would be ${cycleLengthDays} day(s). If bleeding has continued this long, please consult a healthcare provider.`
      );
    }






    
    // ── 8. Cannot end before the last logged entry ────────────────────────────
    const loggedDates  = latestPeriod.period.map((p) => toDateOnly(p.currentDate));
    const latestLogged = loggedDates.sort().at(-1);



    if (latestLogged && endDateOnly < latestLogged) {
    latestPeriod.period = latestPeriod.period.filter(
        (p) => toDateOnly(p.currentDate) <= endDateOnly
    );
    console.log(latestPeriod.period);
        await latestPeriod.save();
    }







    // ── 9. Upsert today's entry if period data was sent ───────────────────────
    if (hasPeriodData) {
      const built = await buildEntryFromPayload(payload, currentDate);
      if (built.error) {
        return badRequestResponse(res, "Invalid flow level.", built.error);
      }
      const { newPeriodEntry } = built;
      const currentDateStr = toDateOnly(currentDate);
      const existingIndex  = latestPeriod.period.findIndex(
        (p) => toDateOnly(p.currentDate) === currentDateStr
      );

      if (existingIndex !== -1) {
        await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
          $set: { [`period.${existingIndex}`]: newPeriodEntry },
        });
      } else {
        await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
          $push: { period: newPeriodEntry },
        });
      }
    }

    // ── 10. Close the cycle + trim pre-filled future entries ──────────────────
    await PeriodTracker.findByIdAndUpdate(latestPeriod._id, {
      $set:  { endDate: parsedEndDate, isEndedByUser: true, currentDate },
      $pull: { period: { currentDate: { $gt: parsedEndDate } } },
    });

    const finalRecord = await PeriodTracker.findById(latestPeriod._id);

    return successResponse(
      res,
      finalRecord,
      "Period end date updated successfully.",
      "Successfully updated period."
    );
  } catch (error) {
    console.error(error);
    return badRequestResponse(res, "Bad request occurred.", error.message);
  }
};


















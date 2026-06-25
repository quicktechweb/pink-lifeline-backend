/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PERIOD TRACKER — API TEST SCRIPT
 * Tests: recordPeriodStart  →  recordPeriodCurrent (daily logs)  →  recordPeriodEnd
 * Coverage: 8 months of simulated period cycles up to today (2026-06-08)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_START   = "http://localhost:5000/api/period/v1/record-start-data";
const API_CURRENT = "http://localhost:5000/api/period/v1/record-current-data";
const API_END     = "http://localhost:5000/api/period/v1/record-end-data";

// const USER_ID = "USR-QR1TYH  ";
const USER_ID = "USR-1HQSUU"

// ─── REFERENCE DATA ───────────────────────────────────────────────────────────

const BLEEDING = {
  noFlow:   { _id: "6a12ef3a0da755ffc1b3c8cb", title: "No Flow",       flowLevel: 0 },
  lowFlow:  { _id: "6a12ef550da755ffc1b3c8d8", title: "Low Flow",      flowLevel: 1 },
  modFlow:  { _id: "6a11766eb9dec79489ffc050", title: "Moderate Flow", flowLevel: 2 },
  highFlow: { _id: "6a117675b9dec79489ffc053", title: "High Flow",     flowLevel: 3 },
};

const SYMPTOMS = {
  none:       { _id: "6a12ed3a85f3e0ddcd0ad964", title: "No symptoms"  },
  moodSwing:  { _id: "6a12ef120da755ffc1b3c8b7", title: "Mood Swing"   },
  feelingLow: { _id: "6a12ef290da755ffc1b3c8c6", title: "Feeling low"  },
  fever:      { _id: "6a12ef6a0da755ffc1b3c8df", title: "Fever"        },
};

const SPOTTING = {
  none:   { _id: "6a12e86efa13c20a31b48e03", title: "No spotting"     },
  light:  { _id: "6a117290e04822ffbd3410b6", title: "Light Spotting"  },
  normal: { _id: "6a12ef1e0da755ffc1b3c8bf", title: "Normal spotting" },
};

// ─── CYCLE DEFINITIONS ────────────────────────────────────────────────────────
// 8 cycles going backwards from today (2026-06-08).
// Each entry: startDate, periodLengthDays (how many daily logs), totalCycleDays
// Cycle gap (next start) = totalCycleDays from current startDate.
// Average cycle: ~28 days. Period length: ~5 days.

const CYCLES = [
  // Most recent first → we'll reverse to process oldest first
  { startOffset: 0,    periodDays: 5, label: "Cycle 8 (Jun 2026)"  }, // starts today
  { startOffset: 28,   periodDays: 5, label: "Cycle 7 (May 2026)"  },
  { startOffset: 56,   periodDays: 6, label: "Cycle 6 (Apr 2026)"  },
  { startOffset: 84,   periodDays: 5, label: "Cycle 5 (Mar 2026)"  },
  { startOffset: 113,  periodDays: 4, label: "Cycle 4 (Feb 2026)"  },
  { startOffset: 141,  periodDays: 6, label: "Cycle 3 (Jan 2026)"  },
  { startOffset: 169,  periodDays: 5, label: "Cycle 2 (Dec 2025)"  },
  { startOffset: 197,  periodDays: 5, label: "Cycle 1 (Nov 2025)"  }, // ~8 months ago
];

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

const TODAY = new Date("2026-06-08T12:00:00.000Z");

/** Returns a UTC date string "YYYY-MM-DD" offset by -n days from TODAY */
function daysAgo(n) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

/** Adds n days to a "YYYY-MM-DD" string, returns new "YYYY-MM-DD" */
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

// ─── DAILY PROFILE LOGIC ─────────────────────────────────────────────────────
// Returns a realistic day-by-day symptom/bleeding/spotting combo

function getDayProfile(dayIndex, totalDays) {
  // Day 0 = start day, dayIndex = 0-based offset within the period
  const isFirst   = dayIndex === 0;
  const isSecond  = dayIndex === 1;
  const isLast    = dayIndex === totalDays - 1;
  const isMid     = !isFirst && !isSecond && !isLast;

  let bleeding, symptoms, spotting;

  if (isFirst) {
    bleeding = BLEEDING.modFlow;
    symptoms = [SYMPTOMS.moodSwing, SYMPTOMS.feelingLow];
    spotting = [SPOTTING.light];
  } else if (isSecond) {
    bleeding = BLEEDING.highFlow;
    symptoms = [SYMPTOMS.moodSwing];
    spotting = [SPOTTING.none];
  } else if (isMid) {
    bleeding = BLEEDING.modFlow;
    symptoms = [SYMPTOMS.none];
    spotting = [SPOTTING.normal];
  } else {
    // Last day — tapering off
    bleeding = BLEEDING.lowFlow;
    symptoms = [SYMPTOMS.none];
    spotting = [SPOTTING.light];
  }

  return { bleeding, symptoms, spotting };
}

// ─── HTTP HELPER ──────────────────────────────────────────────────────────────

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text() };
  }

  return { status: res.status, ok: res.ok, data };
}

// ─── RESULT TRACKER ──────────────────────────────────────────────────────────

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  log: [],
};

function record(label, status, res, body) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️ ";
  const entry = {
    label,
    status,
    httpStatus: res?.status ?? "—",
    message: res?.data?.message ?? res?.data?.error ?? JSON.stringify(res?.data ?? body ?? ""),
  };

  if (status === "PASS") results.passed++;
  else if (status === "FAIL") results.failed++;
  else results.skipped++;

  results.log.push(entry);
  console.log(`  ${icon} [${entry.httpStatus}] ${label} — ${entry.message}`);
}

// ─── TEST CASES ───────────────────────────────────────────────────────────────

// ── 1. recordPeriodStart — happy path (per cycle) ────────────────────────────
async function testPeriodStart(dateStr, label) {
  const { bleeding, symptoms, spotting } = getDayProfile(0, 5);

  const body = {
    userId: USER_ID,
    currentDate: dateStr,
    startDate: dateStr,
    period: {
      bleeding: { _id: bleeding._id, flowLevel: bleeding.flowLevel },
      symptoms: symptoms.map(s => ({ _id: s._id })),
      spotting: spotting.map(s => ({ _id: s._id })),
    },
  };

  const res = await post(API_START, body);
  const pass = res.ok || res.status === 201 || res.status === 200;
  record(`${label} → recordPeriodStart (${dateStr})`, pass ? "PASS" : "FAIL", res);
  return pass;
}

// ── 2. recordPeriodCurrent — log each intermediate day ───────────────────────
async function testPeriodCurrent(dateStr, dayIndex, totalDays, cycleLabel) {
  const { bleeding, symptoms, spotting } = getDayProfile(dayIndex, totalDays);

  const body = {
    userId: USER_ID,
    currentDate: dateStr,
    period: {
      bleeding: { _id: bleeding._id, flowLevel: bleeding.flowLevel },
      symptoms: symptoms.map(s => ({ _id: s._id })),
      spotting: spotting.map(s => ({ _id: s._id })),
    },
  };

  const res = await post(API_CURRENT, body);
  const pass = res.ok || res.status === 200;
  record(`${cycleLabel} → recordPeriodCurrent day +${dayIndex} (${dateStr})`, pass ? "PASS" : "FAIL", res);
}

// ── 3. recordPeriodEnd — close the period ─────────────────────────────────────
async function testPeriodEnd(dateStr, cycleLabel) {
  const body = {
    userId: USER_ID,
    currentDate: dateStr,
    endDate: dateStr,
  };

  const res = await post(API_END, body);
  const pass = res.ok || res.status === 200;
  record(`${cycleLabel} → recordPeriodEnd (${dateStr})`, pass ? "PASS" : "FAIL", res);
}

// ─── EDGE / NEGATIVE CASES ───────────────────────────────────────────────────

async function runEdgeCases() {
  console.log("\n─── EDGE CASES ──────────────────────────────────────────────");

  // a) Future date on start
  {
    const futureDate = addDays(daysAgo(0), 5); // 5 days in the future
    const body = {
      userId: USER_ID,
      currentDate: futureDate,
      startDate: futureDate,
      period: {
        bleeding: { _id: BLEEDING.modFlow._id, flowLevel: 2 },
        symptoms: [{ _id: SYMPTOMS.none._id }],
        spotting: [{ _id: SPOTTING.none._id }],
      },
    };
    const res = await post(API_START, body);
    record("EDGE: Start with future currentDate (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // b) Mismatched currentDate vs startDate
  {
    const today = daysAgo(0);
    const yesterday = daysAgo(1);
    const body = {
      userId: USER_ID,
      currentDate: today,
      startDate: yesterday,
      period: {
        bleeding: { _id: BLEEDING.lowFlow._id, flowLevel: 1 },
        symptoms: [{ _id: SYMPTOMS.none._id }],
        spotting: [{ _id: SPOTTING.none._id }],
      },
    };
    const res = await post(API_START, body);
    record("EDGE: currentDate ≠ startDate (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // c) Missing userId
  {
    const today = daysAgo(0);
    const body = {
      currentDate: today,
      startDate: today,
      period: {
        bleeding: { _id: BLEEDING.modFlow._id, flowLevel: 2 },
        symptoms: [{ _id: SYMPTOMS.none._id }],
        spotting: [{ _id: SPOTTING.none._id }],
      },
    };
    const res = await post(API_START, body);
    record("EDGE: Missing userId on start (expect 400/404)", [400, 404].includes(res.status) ? "PASS" : "FAIL", res);
  }

  // d) Invalid flowLevel
  {
    const today = daysAgo(0);
    const body = {
      userId: USER_ID,
      currentDate: today,
      startDate: today,
      period: {
        bleeding: { _id: BLEEDING.modFlow._id, flowLevel: 99 }, // out of range
        symptoms: [{ _id: SYMPTOMS.none._id }],
        spotting: [{ _id: SPOTTING.none._id }],
      },
    };
    const res = await post(API_START, body);
    record("EDGE: Invalid flowLevel=99 (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // e) recordPeriodCurrent with a date outside any active range
  {
    const orphanDate = daysAgo(3); // likely no active range here after test runs
    const body = {
      userId: USER_ID,
      currentDate: orphanDate,
      period: {
        bleeding: { _id: BLEEDING.lowFlow._id, flowLevel: 1 },
        symptoms: [{ _id: SYMPTOMS.none._id }],
        spotting: [{ _id: SPOTTING.none._id }],
      },
    };
    const res = await post(API_CURRENT, body);
    record("EDGE: recordPeriodCurrent outside active range (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // f) recordPeriodEnd with endDate < startDate
  {
    // Use a date far in the past — should precede any cycle's startDate
    const veryOldDate = daysAgo(250);
    const body = {
      userId: USER_ID,
      currentDate: veryOldDate,
      endDate: veryOldDate,
    };
    const res = await post(API_END, body);
    record("EDGE: recordPeriodEnd with endDate before startDate (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // g) recordPeriodEnd with missing endDate
  {
    const today = daysAgo(0);
    const body = { userId: USER_ID, currentDate: today };
    const res = await post(API_END, body);
    record("EDGE: recordPeriodEnd missing endDate (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // h) recordPeriodEnd with mismatched currentDate ≠ endDate
  {
    const today = daysAgo(0);
    const yesterday = daysAgo(1);
    const body = { userId: USER_ID, currentDate: today, endDate: yesterday };
    const res = await post(API_END, body);
    record("EDGE: recordPeriodEnd currentDate ≠ endDate (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // i) No bleeding/spotting/symptoms in period body
  {
    const today = daysAgo(0);
    const body = {
      userId: USER_ID,
      currentDate: today,
      startDate: today,
      period: {}, // empty — no medical data at all
    };
    const res = await post(API_START, body);
    record("EDGE: Start with empty period body (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }

  // j) Providing both startDate AND endDate together
  {
    const today = daysAgo(0);
    const body = {
      userId: USER_ID,
      currentDate: today,
      startDate: today,
      endDate: today,
      period: {
        bleeding: { _id: BLEEDING.modFlow._id, flowLevel: 2 },
        symptoms: [{ _id: SYMPTOMS.none._id }],
        spotting: [{ _id: SPOTTING.none._id }],
      },
    };
    const res = await post(API_START, body);
    record("EDGE: startDate + endDate together (expect 400)", res.status === 400 ? "PASS" : "FAIL", res);
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

function printSummary() {
  const total = results.passed + results.failed + results.skipped;
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total:   ${total}`);
  console.log(`  ✅ Passed:  ${results.passed}`);
  console.log(`  ❌ Failed:  ${results.failed}`);
  console.log(`  ⚠️  Skipped: ${results.skipped}`);
  console.log("═══════════════════════════════════════════════════════════");

  if (results.failed > 0) {
    console.log("\n  FAILED TESTS:");
    results.log
      .filter(e => e.status === "FAIL")
      .forEach(e => console.log(`    ❌ [${e.httpStatus}] ${e.label}`));
  }
  console.log("");
}

// ─── MAIN RUNNER ─────────────────────────────────────────────────────────────

async function runAll() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PERIOD TRACKER — API TEST SUITE");
  console.log(`  User: ${USER_ID}  |  Host: http://localhost:5000`);
  console.log(`  Today: ${daysAgo(0)}  |  Coverage: 8 months`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Process cycles oldest-first (reverse the array)
  const orderedCycles = [...CYCLES].reverse();

  for (const cycle of orderedCycles) {
    const { startOffset, periodDays, label } = cycle;
    const startDateStr = daysAgo(startOffset);

    console.log(`\n─── ${label} (start: ${startDateStr}, ${periodDays} days) `
      + "─".repeat(Math.max(0, 43 - label.length)));

    // ── STEP 1: Record period start ──────────────────────────────────────────
    const started = await testPeriodStart(startDateStr, label);

    if (!started) {
      // If start fails (e.g. server down or too-recent gap), skip the rest of this cycle
      record(`${label} → recordPeriodCurrent SKIPPED (start failed)`, "SKIP", null);
      record(`${label} → recordPeriodEnd SKIPPED (start failed)`, "SKIP", null);
      continue;
    }

    // ── STEP 2: Record each subsequent day ───────────────────────────────────
    for (let day = 1; day < periodDays - 1; day++) {
      const dayDateStr = addDays(startDateStr, day);

      // Don't log future dates — stop if we've gone past today
      if (new Date(dayDateStr + "T12:00:00.000Z") > TODAY) {
        record(`${label} → day +${day} (${dayDateStr}) SKIPPED — future date`, "SKIP", null);
        break;
      }

      await testPeriodCurrent(dayDateStr, day, periodDays, label);
    }

    // ── STEP 3: Record period end ─────────────────────────────────────────────
    const endDateStr = addDays(startDateStr, periodDays - 1);

    // Skip end if it would be in the future
    if (new Date(endDateStr + "T12:00:00.000Z") > TODAY) {
      record(`${label} → recordPeriodEnd SKIPPED — end date is in future`, "SKIP", null);
    } else {
      await testPeriodEnd(endDateStr, label);
    }
  }

  // ── EDGE CASES ────────────────────────────────────────────────────────────
  await runEdgeCases();

  printSummary();
}

runAll().catch(err => {
  console.error("\n💥 Unhandled error:", err.message);
});
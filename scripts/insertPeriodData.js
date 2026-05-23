const axios = require("axios");

const URL = "http://localhost:5000/api/period/v1/insert-period";
const USER_ID = "USR-CHJNB1";

// ======================================================
// Helper Functions
// ======================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const symptomsPool = [
  { id: 1, title: "Cramps" },
  { id: 2, title: "Headache" },
  { id: 3, title: "Back Pain" },
  { id: 4, title: "Fatigue" },
  { id: 5, title: "Bloating" },
  { id: 6, title: "Mood Swings" },
  { id: 7, title: "Acne" },
  { id: 8, title: "Breast Tenderness" },
  { id: 9, title: "Nausea" },
];

const notesPool = [
  "Flow feels normal today.",
  "Having mild cramps.",
  "Energy level is low.",
  "Heavy flow in the morning.",
  "Feeling bloated.",
  "Mood slightly irritated today.",
  "Mild headache since afternoon.",
  "Symptoms improving.",
  "Period almost ending.",
];

const spottingPool = [
  { id: 1, title: "Brown Spotting" },
  { id: 2, title: "Pink Spotting" },
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ✅ Guarantees at least 1 symptom — satisfies validation if bleeding is absent
function randomSymptoms(min = 1) {
  const count = min + Math.floor(Math.random() * 3);
  const shuffled = [...symptomsPool].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, count).map((s) => ({
    ...s,
    isRecent: 1,
  }));
}

function randomBleeding(day) {
  if (day === 1) return { id: 2, title: "Medium Flow", flowLevel: 2, isSpotting: false };
  if (day === 2 || day === 3) return { id: 3, title: "Heavy Flow", flowLevel: 3, isSpotting: false };
  if (day === 4) return { id: 2, title: "Medium Flow", flowLevel: 2, isSpotting: false };
  return { id: 1, title: "Light Flow", flowLevel: 1, isSpotting: false };
}

// ✅ Occasionally skip bleeding on last day to simulate period tapering off
function randomBleedingOrNull(day, isLastDay) {
  if (isLastDay && Math.random() > 0.6) return undefined;
  return randomBleeding(day);
}

function randomSpotting(isLastDay) {
  // ✅ Higher spotting chance on last day (tapering)
  const threshold = isLastDay ? 0.5 : 0.8;
  return Math.random() > threshold ? [randomItem(spottingPool)] : [];
}

function formatDate(date) {
  return new Date(date).toISOString();
}

// ======================================================
// Main Generator
// ======================================================

async function generatePeriodData() {
  let currentCycleStart = new Date("2026-01-05");

  const totalCycles = 8;

  for (let cycle = 1; cycle <= totalCycles; cycle++) {
    console.log(`\n==============================`);
    console.log(`  Cycle ${cycle}`);
    console.log(`==============================\n`);

    const cycleLength = 26 + Math.floor(Math.random() * 5);   // 26–30 days
    const periodDuration = 4 + Math.floor(Math.random() * 3); // 4–6 days

    // --------------------------------------------------
    // DAY 1 — START PERIOD (explicit startDate)
    // --------------------------------------------------

    const startPayload = {
      userId: USER_ID,
      currentDate: formatDate(currentCycleStart),
      startDate: formatDate(currentCycleStart),
      period: {
        bleeding: randomBleeding(1),
        symptoms: randomSymptoms(),
        spotting: [],
        notes: randomItem(notesPool),
      },
    };

    try {
      const res = await axios.post(URL, startPayload);
      console.log(`✅ Cycle ${cycle} — Day 1 (Start)`);
      console.log(`   ${res.data.message}\n`);
    } catch (err) {
      console.log(`❌ Cycle ${cycle} — Day 1 Error`);
      console.log(`   ${JSON.stringify(err?.response?.data || err.message)}\n`);
    }

    await sleep(500);

    // --------------------------------------------------
    // DAYS 2 → N — DAILY LOGS (last day carries endDate)
    // --------------------------------------------------

    for (let day = 2; day <= periodDuration; day++) {
      const currentDay = new Date(currentCycleStart);
      currentDay.setDate(currentDay.getDate() + (day - 1));

      const isLastDay = day === periodDuration;
      const bleeding = randomBleedingOrNull(day, isLastDay);
      const spotting = randomSpotting(isLastDay);

      // ✅ Ensure at least one of bleeding / spotting / symptoms is present
      const symptoms = !bleeding && !spotting.length
        ? randomSymptoms(1)   // force at least 1 symptom
        : randomSymptoms();

      const payload = {
        userId: USER_ID,
        currentDate: formatDate(currentDay),
        ...(isLastDay && { endDate: formatDate(currentDay) }), // ✅ only on last day
        period: {
          bleeding,
          symptoms,
          spotting,
          notes: randomItem(notesPool),
        },
      };

      try {
        const res = await axios.post(URL, payload);
        console.log(`✅ Cycle ${cycle} — Day ${day}${isLastDay ? " (End)" : ""}`);
        console.log(`   ${res.data.message}\n`);
      } catch (err) {
        console.log(`❌ Cycle ${cycle} — Day ${day} Error`);
        console.log(`   ${JSON.stringify(err?.response?.data || err.message)}\n`);
      }

      await sleep(500);
    }

    // --------------------------------------------------
    // ADVANCE TO NEXT CYCLE
    // --------------------------------------------------
    currentCycleStart = new Date(currentCycleStart);
    currentCycleStart.setDate(currentCycleStart.getDate() + cycleLength);
  }

  console.log("\n====================================");
  console.log("🎉 REALISTIC PERIOD DATA GENERATED");
  console.log("====================================\n");
}

generatePeriodData();
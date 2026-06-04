

const URL = "http://localhost:5000/api/period/v1/insert-period";
// const USER_ID = "USR-CHJNB1";
const USER_ID = "USR-1HQSUU";
// const USER_ID = "USR-SX0UWB";

// ======================================================
// Helper Functions
// ======================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const symptomsPool = [
  {
    id: "6a12ed3a85f3e0ddcd0ad964",
    title: "meh",
    isRecent: 1,
    __v: 0
  },
  {
    id: "6a12ef120da755ffc1b3c8b7",
    title: "1231",
    isRecent: 1,
    __v: 0
  },
  {
    id: "6a12ef290da755ffc1b3c8c6",
    title: "123543534",
    isRecent: 0,
    __v: 0
  },
  {
    id: "6a12ef6a0da755ffc1b3c8df",
    title: "54325",
    isRecent: 0,
    __v: 0
  }
]



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
  {
    id: "6a12ef1e0da755ffc1b3c8bf",
    title: "123",
    createdAt: "2026-05-24T12:29:18.279Z",
    updatedAt: "2026-05-24T12:29:18.279Z",
    __v: 0
  },
  {
    id: "6a12e86efa13c20a31b48e03",
    title: "asdasd",
    createdAt: "2026-05-24T12:00:46.629Z",
    updatedAt: "2026-05-24T12:00:46.629Z",
    __v: 0
  },
  {
    id: "6a117290e04822ffbd3410b6",
    title: "Light Spotting nope 1",
    id: 1,
    createdAt: "2026-05-23T09:25:36.712Z",
    updatedAt: "2026-05-24T11:57:47.686Z",
    __v: 0
  }
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

const bleedingData = [
  {
    id: "6a11766eb9dec79489ffc050",
    title: "bleeding 2",
    flowLevel: 2,
    hadFlow: true,
  },
  {
    id: "6a117675b9dec79489ffc053",
    title: "bleeding 0",
    flowLevel: 3,
    hadFlow: true,
  },
  {
    id: "6a12ef3a0da755ffc1b3c8cb",
    title: "new title",
    flowLevel: 0,
    hadFlow: false,
  },
  {
    id: "6a12ef550da755ffc1b3c8d8",
    title: "as3q2q",
    flowLevel: 2,
    hadFlow: true,
  },
];

// Find matching items
const noFlow = bleedingData.find((b) => !b.hadFlow);
const mediumFlow = bleedingData.find((b) => b.flowLevel === 2);
const heavyFlow = bleedingData.find((b) => b.flowLevel === 3);


function randomBleeding(day) {
  if (day === 1) return mediumFlow;
  if (day === 2 || day === 3) return heavyFlow;
  if (day === 4) return mediumFlow;
  return noFlow;
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
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      console.log(`✅ Cycle ${cycle} — Day 1 (Start)`);
      console.log(`   ${data.message}\n`);
    } catch (err) {
      console.log(`❌ Cycle ${cycle} — Day 1 Error`);
      console.log(`   ${err?.message || err}\n`);
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
        const response = await fetch(URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(JSON.stringify(data));
        }

        console.log(`✅ Cycle ${cycle} — Day ${day}${isLastDay ? " (End)" : ""}`);
        console.log(`   ${data.message}\n`);
      } catch (err) {
        console.log(`❌ Cycle ${cycle} — Day ${day} Error`);
        console.log(`   ${err?.message || err}\n`);
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
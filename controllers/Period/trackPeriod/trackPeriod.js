import { badRequestResponse, notFoundResponse, somethingWentWrong, successResponse } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
import PeriodDateNoteModel from "../../../models/Period/PeriodDateNoteModel.js";

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



    const requestDate = payload?.period?.[0]?.date ? new Date(payload.period[0].date) : new Date();



    let tracker = await PeriodTracker.findOne({ userId: payload.userId });



    if (tracker && tracker.period.length > 0) {
      
      tracker.period.sort((a, b) => new Date(b.date) - new Date(a.date));
      const latestDate = new Date(tracker.period[0].date);
      const diffTime = Math.abs(requestDate - latestDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
          

      // 🔹 Check if gap is 7 days or more
      if (diffDays <= process.env.POST_MENSTRUAL_INTERVAL ) {
        successResponse(res,{diffDays},    `You already recorded a period recently. New period data cannot be added within ${process.env.POST_MENSTRUAL_INTERVAL} days.`,`Last period data is recorded in ${process.env.POST_MENSTRUAL_INTERVAL}`)
      } 


    }

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
  try {
    const { userId } = req.body;

    if (!userId) {
      return notFoundResponse(res, "User not found");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }

    const POST_MENSTRUAL_INTERVAL = Number(process.env.POST_MENSTRUAL_INTERVAL || 10);

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
      return successResponse(res, { cycles: [] }, "No period data found.", "Empty dataset.");
    }

    let cycles = [];
    let currentCycle = [];
    let lastDate = null;
    let exceptCurrentCycle = [];

    //cycle count 1
    for (const item of allPeriods) {
      const currentDate = item.date;

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
    }
    //cycle count 2
    if (currentCycle.length) {
      exceptCurrentCycle = [...cycles];
      cycles.push(currentCycle);
    }

    // successResponse(res,cycles,"take cycles")

    const cycleInsights = cycles.map((cycle, index) => {
      const startDate = cycle[0].date;
      const endDate = cycle[cycle.length - 1].date;

      const cycleDuration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

      const bleedingDays = cycle.filter((d) => d?.bleeding?.flowLevel >= 1);

      const bleedingDuration = bleedingDays.length;

      const symptomFrequency = cycle.reduce((acc, day) => {
        return acc + (day.symptoms?.length || 0);
      }, 0);

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
      {
        totalCycles: cycles.length,
        cycleInsights,
      },
      "Cycle insights generated successfully.",
      "Insights computed successfully.",
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const addDailyNote = async(req,res) => {
  const payload = req.body
  const userId = req.params.userId

  // process.exit(0)

  const {time,date,note} = payload

  try {
      const newDailyNote = await PeriodDateNoteModel.create({time,date,note,userId:userId });
      successResponse(res,newDailyNote,"Note has been created successfully.",`Period day note has been added.`)

  } catch (error) {
    console.error(error)
    somethingWentWrong(res,error,"Something went wrong.")
  }
}
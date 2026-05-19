import { badRequestResponse, checkValidGapBetweenPeriods, notFoundResponse, somethingWentWrong, successResponse } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
import PeriodDateNoteModel from "../../../models/Period/PeriodDateNoteModel.js";


































const savePeriodDataIntoDB = async (res,payload) => {
        const newPeriodEntry = {
          bleeding: payload.period?.bleeding,
          symptoms: payload.period?.symptoms,
          spotting: payload.period?.spotting,
        };

        const newPeriodData = await PeriodTracker.create({
          userId: payload.userId,
          currentDate: payload.currentDate,
          startDate: payload?.startDate ,
          endDate: payload?.endDate ,
          period: [newPeriodEntry],
        });

     return successResponse(res, newPeriodData, "Period log recorded successfully.", "Successfully recorded period log.");
}








export const recordPeriodLog = async (req, res) => {
  try {
    const payload = req.body;


    //done validation
    if (!payload.userId) {
      return notFoundResponse(res, "User not found.", "User ID is missing.");
    }

    const isUserExist = await User.findOne({ userId: payload.userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User is not registered.");
    }


    if (!payload.period.bleeding && !payload.period.spotting && !payload.period.symptoms) {
      return badRequestResponse(res, "Bad request occurred.", "No bleeding, symptoms, or spotting found.");
    }
    //done validation








    if (!payload.currentDate && !payload.startDate && !payload.endDate) {
      return badRequestResponse(res, "Bad request occurred.", "Current date, start date, or end date is required.");
    }

    if (payload.startDate && payload.endDate) {
      return badRequestResponse(res, "Bad request occurred.", "End date cannot be provided when start date is present.");
    }

    if ((payload.startDate || payload.endDate) && !payload.currentDate ) {
      payload.currentDate = payload.startDate || payload.endDate;
    }

    






    const previousPeriodData = await PeriodTracker.findOne({ userId: payload.userId,   endDate: { $exists: true, $ne: null } }).sort({ createdAt: -1 });

    //! without previous period data
    if (!previousPeriodData) {
      if (payload.currentDate) {
        payload.endDate = payload.currentDate;
      }
      return savePeriodDataIntoDB(res,payload)
    } else {
    
      //! with previous period data

      if (payload.startDate) {
        const isValidGap = checkValidGapBetweenPeriods(new Date(previousPeriodData.startDate), new Date(payload.currentDate));
        if (!isValidGap) {
        
          return badRequestResponse(res, "Frequent period entry detected.","Frequent period entry is detected")
        
        }else{

          return savePeriodDataIntoDB(res,payload)

        }

        if (  ) {
          
        }

      }



    }

    



    




    //new user 
    if (!previousPeriodData) {
      if (payload.startDate && payload.endDate) {

        return badRequestResponse(res, "Bad request occurred.", "Start date and end date cannot be provided for the first period entry.");

      }else if (payload.startDate && !payload.endDate) {

        payload.currentDate = payload.currentDate || new Date();
        payload.endDate = payload.currentDate;

      }



      }else{

        //! existing user with previous period data

        if (payload.startDate ) {

          const isValidGap = checkValidGapBetweenPeriods(new Date(previousPeriodData.startDate), new Date(payload.currentDate));

          if (!isValidGap) {
            
            return badRequestResponse(res, "Frequent period entry detected.","Frequent period entry is detected")
          
          }else{

            payload.endDate = payload.currentDate;
            
           

          }
        }

        else if (!payload.startDate && !payload.endDate) {
          payload.endDate = payload.currentDate;

          if (previousPeriodData.endDate) {
            const isValidGap = checkValidGapBetweenPeriods(new Date(previousPeriodData.endDate), new Date(payload.currentDate));

            if (!isValidGap) {
              return badRequestResponse(res, "Frequent period entry detected.","Frequent period entry is detected")
            }else{
               const newPeriodEntry = {
              bleeding: payload.period?.bleeding,
              symptoms: payload.period?.symptoms,
              spotting: payload.period?.spotting,
            };

            const newPeriodData = await PeriodTracker.create({
              userId: payload.userId,
              currentDate: payload.currentDate,
              startDate: payload?.startDate ,
              endDate: payload?.endDate ,
              period: [newPeriodEntry],
            });

            successResponse(res, newPeriodData, "Period log recorded successfully.", "Successfully recorded period log.");
            }


          }

          const isValidGap = checkValidGapBetweenPeriods(new Date(previousPeriodData.currentDate), new Date(payload.currentDate));
          if (!isValidGap){
            return badRequestResponse(res, "Frequent period entry detected.","Frequent period entry is detected")
          }else{
             const newPeriodEntry = {
              bleeding: payload.period?.bleeding,
              symptoms: payload.period?.symptoms,
              spotting: payload.period?.spotting,
            };

            const newPeriodData = await PeriodTracker.create({
              userId: payload.userId,
              currentDate: payload.currentDate,
              startDate: payload?.startDate ,
              endDate: payload?.endDate ,
              period: [newPeriodEntry],
            });

            successResponse(res, newPeriodData, "Period log recorded successfully.", "Successfully recorded period log.");
          }


        }else if ( payload.endDate ){
          const isValidGap = checkValidGapBetweenPeriods(new Date(previousPeriodData.currentDate), new Date(payload.currentDate));
          if (!isValidGap){
            return badRequestResponse(res, "Frequent period entry detected.","Frequent period entry is detected")
          }
        }

        
      }











































    if (previousPeriodData) {
      
      const previousDate = new Date(previousPeriodData.currentDate);
      const currentDate = new Date(payload.currentDate);

      const isValidGap = checkValidGapBetweenPeriods(previousDate, currentDate);

     if (!isValidGap) {
        return badRequestResponse(res, "Frequent period entry detected.","Frequent period entry is detected")
      }

      if (!payload.startDate && !payload.endDate && isValidGap) {
        payload.endDate = payload.currentDate;
      }


      if (payload.startDate) {
        payload.endDate = undefined;
      }

      if (previousDate.startDate) {
        
      }

    
    } else{
      
      


        const newPeriodEntry = {
          bleeding: payload.period?.bleeding,
          symptoms: payload.period?.symptoms,
          spotting: payload.period?.spotting,
        };

        const newPeriodData = await PeriodTracker.create({
          userId: payload.userId,
          currentDate: payload.currentDate,
          startDate: payload?.startDate ,
          endDate: payload?.endDate,
          period: [newPeriodEntry],
        });

        return successResponse(res, newPeriodData, "Period log recorded successfully.", "Successfully recorded period log.");



    }










    // if (!Array.isArray(payload.period) || payload.period.length === 0) {
    //   return badRequestResponse(res, "Wrong input.", "Period array is required.");
    // }



    // const requestDate = payload?.period?.[0]?.date ? new Date(payload.period[0].date) : new Date();



    // let tracker = await PeriodTracker.findOne({ userId: payload.userId });



    // if (tracker && tracker.period.length > 0) {
      
    //   tracker.period.sort((a, b) => new Date(b.date) - new Date(a.date));
    //   const latestDate = new Date(tracker.period[0].date);
    //   const diffTime = Math.abs(requestDate - latestDate);
    //   const diffDays = diffTime / (1000 * 60 * 60 * 24);
          

    //   // 🔹 Check if gap is 7 days or more
    //   if (diffDays <= process.env.POST_MENSTRUAL_INTERVAL ) {
    //     return successResponse(res,{diffDays},    `You already recorded a period recently. New period data cannot be added within ${process.env.POST_MENSTRUAL_INTERVAL} days.`,`Last period data is recorded in ${process.env.POST_MENSTRUAL_INTERVAL}`)
    //   } 


    // }

    // if (!tracker) {
    //   tracker = new PeriodTracker({
    //     userId: payload.userId,
    //     period: [],
    //   });
    // }



    // for (const item of payload.period) {
    //   if (!item.date) {
    //     item.date = new Date();
    //   }

    //   if (!item.bleeding && !item.symptoms && !item.spotting) {
    //     return badRequestResponse(res, "Bad request occurred.", "No bleeding, symptoms, or spotting found.");
    //   }

    //   if (item?.bleeding) {
    //     const flowLevel = item?.bleeding?.flowLevel;

    //     if (flowLevel !== undefined && ![0, 1, 2, 3].includes(flowLevel)) {
    //       return badRequestResponse(res, "Wrong input.", "Invalid flow level.");
    //     }
    //   }

    //   const existingIndex = tracker.period.findIndex((p) => new Date(p.date).toDateString() === new Date(item.date).toDateString());

    //   if (existingIndex !== -1) {
    //     tracker.period[existingIndex] = {
    //       ...tracker.period[existingIndex]._doc,
    //       ...item,
    //     };
    //   } else {
    //     tracker.period.push(item);
    //   }
    // }

    // await tracker.save();

    // return successResponse(res, tracker, "Period log updated successfully.", "Successfully updated period log.");
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
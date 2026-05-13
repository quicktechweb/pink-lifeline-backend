import { badRequestResponse, notFoundResponse } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
export const trackPeriod = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.userId) {
      notFoundResponse(res, "User not found");
    } else {
      const isUserExist = await User.findOne({
        userId: payload.userId,
      });
      if (isUserExist) {
        notFoundResponse(res, "User does not exist.");
      }
    }

    if (payload.bleeding) {
      const { flowLevel, id } = payload.bleeding;
      if (flowLevel && id === 1 && ![1, 2, 3].includes(flowLevel)) {
        badRequestResponse(res, "Invalid bleeding flow.", "Invalid Flow level requested.");
      }
    }

    if (payload.startDate) {
      const result = await PeriodTracker.findOne({
        userId: payload.userId,
        startDate: payload.startDate,
      });

      if (result) {
        if (payload.endDate) {
          result.endDate = payload.endDate;
        }

        const newPeriod = {
          date: payload.currentDate,

          bleeding: payload.bleeding ? payload.bleeding : undefined,

          symptoms: payload.symptoms || [],

          spotting: payload.spotting || [],
        };

        result.period.push(newPeriod);

        await result.save();

        return res.status(200).json({
          success: true,
          message: "Period updated successfully",
          data: result,
        });
      } else {
        const formattedPayload = {
          userId: payload.userId,

          startDate: payload.startDate,

          endDate: payload.endDate,

          period: [
            {
              date: payload.currentDate,

              bleeding: payload.bleeding ? payload.bleeding : undefined,

              symptoms: payload.symptoms || [],

              spotting: payload.spotting || [],
            },
          ],
        };

        const response = await PeriodTracker.create(formattedPayload);
        return res.status(200).json({
          success: true,
          message: "Log recorded successfully.",
          data: response,
        });
      }
    } else if (!payload.startDate) {
      notFoundResponse(res, "Start Date not found.", "start date property is missing.");
    }

    // const result = await PeriodTracker.create({payload})
  } catch (error) {
    console.error(error);

    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

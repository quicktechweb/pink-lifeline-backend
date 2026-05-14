import { badRequestResponse, notFoundResponse, successResponse } from "../../../utils/utils.js";
import User from "../../../models/DoctorRegistration/DoctorRegistration.js";
import PeriodTracker from "./../../../models/Period/PeriodModel.js";
export const trackPeriod = async (req, res) => {
  try {
    const payload = req.body;

    // ✅user exist
    if (!payload.userId) {
      notFoundResponse(res, "User not found");
    } else {
      const isUserExist = await User.findOne({
        userId: payload.userId,
      });
      if (!isUserExist) {
        notFoundResponse(res, "User not found.", "User email is not registered.");
      }
    }


    if (payload.isStart === 1) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      payload.startDate = today.toISOString();
    }

    if (payload.isEnd === 1) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      payload.endDate = today.toISOString();
    } else {
      payload.period?.forEach((item) => {
        const { bleeding } = item;

        if (bleeding) {
          const { flowLevel, id } = bleeding;

          if (![0, 1, 2, 3].includes(flowLevel)) {
            return badRequestResponse(res, "Invalid bleeding flow.", "Invalid flow level requested.");
          }
          // I have to check here if today is in flow or not. What if user never come back here and mark the end in the app. SO it would be my end date.
          if (flowLevel !== 0) {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            payload.endDate = today.toISOString();
          }

          //I have to check if the flow is off and user forgot to entry or did enter doesn't matter it would be my end date.
          else {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            payload.endDate = today.toISOString();
          }
        }
      });
    }

    // ✅both start date and end date cannot be exist same time
    if (payload.isEnd && payload.isStart) {
      badRequestResponse(res, "Invalid input.", "Passing both startDate and endDate at the same time same date is not valid.");
    }

    // ✅ currentDate assigned
    if (!payload.currentDate) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      payload.currentDate = today.toISOString();
    }

    const result = await PeriodTracker.create(payload);
    successResponse(res, result, "Period data recorded successfully.", "Successfully period data entered.");
  } catch (error) {
    console.error(error);

    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

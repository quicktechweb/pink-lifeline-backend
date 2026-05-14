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

    // ✅bleeding flow check done
    if (payload.bleeding) {
      const { flowLevel, id } = payload.bleeding;
      if (flowLevel && id === 1 && ![1, 2, 3].includes(flowLevel)) {
        badRequestResponse(res, "Invalid bleeding flow.", "Invalid Flow level requested.");
      }
    }

    // ✅both start date and end date cannot be exist same time
    if (payload.startDate && payload.endDate) {
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

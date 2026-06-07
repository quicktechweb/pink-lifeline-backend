import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { WeeklyDays } from "../../models/Schedule/doctorSchedule.js";
import { notFoundResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, phoneNumber, autoReminderLimit, notificationPreferenceTime, dateOfBirth } = req.body;

    const updateData = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    // if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (autoReminderLimit !== undefined) updateData.autoReminderLimit = autoReminderLimit;

    if (notificationPreferenceTime !== undefined) {
      const date = new Date(notificationPreferenceTime);
      updateData.notificationPreferenceTime = date.toISOString().substring(11, 16);
    }

    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    const updatedUser = await User.findOneAndUpdate({ userId }, { $set: updateData }, { new: true });
    successResponse(res, updatedUser, "User profile updated successfully.", "User profile updated successfully.");
  } catch (error) {
    somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const addToWishList = async (req, res) => {
  try {
    const { userId } = req.params;
    const { doctorUserId } = req.body;

    const isDoctorExist = await User.findOne({
      userId: doctorUserId,
      type: 1,
      $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
    });

    if (!isDoctorExist) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const user = await User.findOne({
      userId,
      type: 0,
      $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
    });

    const exists = user.doctorWishList.includes(doctorUserId);

    if (exists) {
      user.doctorWishList = user.doctorWishList.filter((id) => id !== doctorUserId);
    } else {
      user.doctorWishList.push(doctorUserId);
    }

    const updatedUser = await user.save();
    successResponse(res, updatedUser, "Wish list updated successfully.", "Wish list updated successfully.");
  } catch (error) {
    somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getUserDoctorWishList = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId, type: 0 }, { doctorWishList: 1 });
    if (!user) {
      notFoundResponse(res, "User not found.", "User not found.");
    }

    const { doctorWishList } = user;

    const doctors = await User.find({
      userId: { $in: user.doctorWishList },
      type: 1,
      isRemoved: { $ne: true },
    })
      .select("userId fullName email phoneNumber doctorRegistrationNumber currentWorkplace profileImage")
      .lean();

      const weeklySchedule = await WeeklyDays.create({
        userId,
        days: {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: [],
        }
      })

    successResponse(res, doctors, "Wish list fetched successfully.", "Wish list fetched successfully.");
  } catch (error) {
    somethingWentWrong(res, error, "Something went wrong.");
  }
};



export const userBookingAppointment = (req, res) => {
  try{
    
    const { userId } = req.params;
    const payload = req.body;


    


    return successResponse(res, payload, "Appointment created successfully.", "Appointment created successfully.");

  }catch(error){
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
}
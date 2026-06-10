import { uploadToImageBB } from "../../config/uploadToImageBB.js";
import { Comment } from "../../models/Community/CommentModel.js";
import { Post } from "../../models/Community/PostModel.js";
import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { WeeklyDays } from "../../models/Schedule/doctorSchedule.js";
import { formatQuantityNumber, notFoundResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const { fullName, email, phoneNumber, autoReminderLimit, notificationPreferenceTime, dateOfBirth } = req.body;

    const updateData = {};

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    // if (email !== undefined) {
    //   updateData.email = email;
    // }

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
    }

    if (autoReminderLimit !== undefined) {
      updateData.autoReminderLimit = autoReminderLimit;
    }

    if (notificationPreferenceTime !== undefined) {
      const date = new Date(notificationPreferenceTime);

      updateData.notificationPreferenceTime = date.toISOString().substring(11, 16);
    }

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth;
    }

    /* =========================
       PROFILE PHOTO
    ========================= */

    if (req.file) {
      const uploaded = await uploadToImageBB(req.file);

      if (uploaded) {
        updateData.profilePhoto = uploaded;
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return successResponse(res, updatedUser, "User profile updated successfully.", "User profile updated successfully.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Something went wrong.");
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
      },
    });

    successResponse(res, doctors, "Wish list fetched successfully.", "Wish list fetched successfully.");
  } catch (error) {
    somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({
      type: 1,
      isVerified: true,
      $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
    })
      .select("fullName doctorRegistrationNumber email isVerified currentWorkplace userId createdAt updatedAt isRemoved")
      .lean();

    if (!doctors.length) {
      return notFoundResponse(res, "No doctors found.", "Get all doctors failed: empty result.");
    }

    return successResponse(res, doctors, "Doctors retrieved successfully", "Get all doctors successful.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to get doctors.", "Get all doctors error");
  }
};

export const userBookingAppointment = (req, res) => {
  try {
    const { userId } = req.params;
    const payload = req.body;

    return successResponse(res, payload, "Appointment created successfully.", "Appointment created successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};
















export const getUserProfileInsights = async (req, res) => {
  const { userId } = req.params;
  try {
    let totalPosts = await Post.find({ userId }).countDocuments();
    totalPosts = formatQuantityNumber(totalPosts);

    let totalComments = await Comment.find({ userId }).countDocuments();
    totalComments = formatQuantityNumber(totalComments);

    const result = await Post.aggregate([
      {
        $match: { userId },
      },
      {
        $group: {
          _id: null,
          totalUpVotes: { $sum: "$upvote" },
        },
      },
    ]);

    let totalUpVotes = result[0]?.totalUpVotes || 0;
    totalUpVotes = formatQuantityNumber(totalUpVotes);

    return successResponse(
      res,
      {
        totalPosts,
        totalComments,
        totalUpVotes,
      },
      "User profile insights fetched successfully.",
      "User profile insights fetched successfully.",
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, "Something went wrong.", error.message);
  }
};

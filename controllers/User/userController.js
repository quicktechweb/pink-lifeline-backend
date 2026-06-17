import { uploadToImageBB } from "../../config/uploadToImageBB.js";
import { ENV } from "../../constant/constant.js";
import { Comment } from "../../models/Community/CommentModel.js";
import { Post } from "../../models/Community/PostModel.js";
import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { ExceptionalDays, WeeklyDays } from "../../models/Schedule/doctorSchedule.js";
import { Appointment } from "../../models/Schedule/userBooking.js";
import { sendNotificationToUser } from "../../services/notificationService.js";
import { convertTo24Hour, formatQuantityNumber, isValid24h, notFoundResponse, somethingWentWrong, successResponse, toMinutes } from "../../utils/utils.js";

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const { fullName,notificationPreferenceDate, email, phoneNumber, autoReminderLimit, notificationPreferenceTime, dateOfBirth } = req.body;


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

    if (notificationPreferenceDate !== undefined) {
      updateData.notificationPreferenceDate = notificationPreferenceDate;
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

// controllers/appointmentController.js

// ─── Helper: "YYYY-MM-DD" → "mon" | "tue" | ... ──────────────────────────────
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getDayKey(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return DAY_KEYS[d.getUTCDay()];
}

































// ─── POST /appointments/book ──────────────────────────────────────────────────
// Body: { userId, doctorUserId, appointmentDate, startTime, endTime, note? }
export async function bookAppointment(req, res) {
  try {
    let { userId, doctorUserId, appointmentDate, startTime, endTime, note } = req.body;
    startTime = convertTo24Hour(startTime);
    endTime = convertTo24Hour(endTime);

    // ── 1. Basic field check ──────────────────────────────────────────────────
    if (!userId || !doctorUserId || !appointmentDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: ENV=="dev"? "userId, doctorUserId, appointmentDate, startTime, endTime are required.":"Necessary fields are missing.",
      });
    }

    appointmentDate = new Date(appointmentDate).toISOString().split("T")[0];

    // ── 2. Date format guard ──────────────────────────────────────────────────
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      return res.status(400).json({
        success: false,
        message: "appointmentDate must be YYYY-MM-DD.",
      });
    }

    // ── 3. Resolve schedule for this date ─────────────────────────────────────
    //       ExceptionalDays takes priority over WeeklyDays
    let daySchedule = null; // { isEnable, time: [{ startTime, endTime, maxAppointments }] }

    const exceptional = await ExceptionalDays.findOne({
      doctorUserId,
      date: appointmentDate,
    }).lean();

    if (exceptional) {
      // Doctor has explicitly set a schedule override for this date
      daySchedule = {
        isEnable: exceptional.isEnable,
        time: exceptional.time,
      };
    } else {
      // Fall back to weekly schedule
      const dayKey = getDayKey(appointmentDate);
      const weekly = await WeeklyDays.findOne({ doctorUserId }).lean();

      if (weekly && weekly[dayKey]) {
        daySchedule = weekly[dayKey];
      }
    }

    // ── 4. Availability checks ────────────────────────────────────────────────
    if (!daySchedule || !daySchedule.isEnable) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not available on this date.",
      });
    }

    // Find the matching time slot
    const matchedSlot = daySchedule.time.find((slot) => {
      return slot.startTime === startTime && slot.endTime === endTime;
    });

    if (!matchedSlot) {
      return res.status(400).json({
        success: false,
        message: "Requested time slot does not exist in doctor's schedule.",
        availableSlots: daySchedule.time.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    }



    // ── 5. Check slot capacity ────────────────────────────────────────────────
    // const bookedCount = await Appointment.countDocuments({
    //   doctorUserId,
    //   appointmentDate,
    //   startTime,
    //   endTime,
    //   status: { $in: ["pending", "confirmed"] },
    //   isDeleted: false,
    // });



    // if (bookedCount >= matchedSlot.maxAppointments) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `This slot is fully booked. Maximum ${matchedSlot.maxAppointments} appointments allowed.`,
    //   });
    // }

    // ── 6. Prevent duplicate booking (same user, same slot) ───────────────────
    const duplicate = await Appointment.findOne({
      userId,
      doctorUserId,
      appointmentDate,
      startTime,
      endTime,
      status: { $in: ["pending", "confirmed"] },
      isDeleted: false,
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "You already have an active booking for this slot.",
      });
    }

    // ── 7. Create appointment ─────────────────────────────────────────────────
    const appointment = await Appointment.create({
      userId,
      doctorUserId,
      appointmentDate,
      startTime,
      endTime,
      note: note || "",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      data: appointment,
    });
  } catch (err) {
    console.error("[bookAppointment]", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}




































export const editAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { note, appointmentDate, startTime, endTime } = req.body;

  try {
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      isDeleted: false,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    // only pending appointments can be edited
    if (appointment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a ${appointment.status} appointment.`,
      });
    }

    // validate times if provided
    // if (startTime && !isValid24h(startTime)) {
    //   return res.status(400).json({ success: false, message: "Invalid startTime format." });
    // }
    // if (endTime && !isValid24h(endTime)) {
    //   return res.status(400).json({ success: false, message: "Invalid endTime format." });
    // }

 

    const resolvedStart = isValid24h(startTime) ? startTime : isValid24h(endTime) ? startTime :  convertTo24Hour(startTime) || convertTo24Hour(appointment.startTime);
    const resolvedEnd =isValid24h(endTime) ? endTime :  convertTo24Hour(endTime) || convertTo24Hour(appointment.endTime);

    if (toMinutes(resolvedStart) >= toMinutes(resolvedEnd)) {
      return res.status(400).json({
        success: false,
        message: "Start time must be before end time.",
      });
    }

    // build update object — only include what was sent
    const updates = {};
    if (note !== undefined) updates.note = note;
    if (appointmentDate) updates.appointmentDate = appointmentDate;
    if (startTime) updates.startTime = resolvedStart;
    if (endTime) updates.endTime = resolvedEnd;

    const updated = await Appointment.findByIdAndUpdate(appointmentId, { $set: updates }, { new: true, runValidators: true });

    return successResponse(res, updated, "Appointment updated successfully.", "Appointment updated successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};





































export const deleteAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { cancelledBy, userId } = req.body; // "user" | "doctor" | "admin"

  if (!["user", "doctor", "admin"].includes(cancelledBy)) {
    return res.status(400).json({
      success: false,
      message: "cancelledBy must be 'user', 'doctor', or 'admin'.",
    });
  }

  try {
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      isDeleted: false,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed appointment.",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled.",
      });
    }

    if (cancelledBy=="user") {
      const user = await User.findOne({ userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const notification = await sendNotificationToUser({
        userId: appointment.userId,
        title: "Appointment Cancelled",
        body: `Your appointment with ${user.fullName} has been cancelled.`,
        type: "appointmentCancelled",
      })
    }



    const updated = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          status: "cancelled",
          cancelledBy,
          isDeleted: true,
        },
      },
      { new: true },
    );

    return successResponse(res, updated, "Appointment cancelled successfully.", "Appointment cancelled successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};




export const getUserAppointments = async (req, res) => {
  const { userId } = req.params;

  try {
    const appointments = await Appointment.find({
      userId,
      isDeleted: false,
    }).lean();

    const doctorIds = [
      ...new Set(appointments.map((a) => a.doctorUserId)),
    ];

    const doctors = await User.find({
      userId: { $in: doctorIds },
    }).lean();

    const doctorMap = new Map(
      doctors.map((doctor) => [doctor.userId, doctor])
    );

    const enrichedAppointments = appointments.map((appointment) => {
      const doctor = doctorMap.get(appointment.doctorUserId);

      if (!doctor) {
        return {
          ...appointment,
          status: "cancelled",
          doctor: null,
        };
      }

      return {
        ...appointment,
        doctor,
      };
    });

    return successResponse(
      res,
      enrichedAppointments,
      "Appointments retrieved successfully.",
      "Get appointments successful."
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(
      res,
      error,
      "Something went wrong."
    );
  }
};
import mongoose from "mongoose";
import { uploadToImageBB } from "../../config/uploadToImageBB.js";
import { DayMap, ENV } from "../../constant/constant.js";
import { Comment } from "../../models/Community/CommentModel.js";
import { Post } from "../../models/Community/PostModel.js";
import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import DoctorRatingModel from "../../models/Rating/DoctorRatingModel.js";
import { ExceptionalDays, WeeklyDays } from "../../models/Schedule/doctorSchedule.js";
import { Appointment } from "../../models/Schedule/userBooking.js";
import { sendNotificationToUser } from "../../services/notificationService.js";
import { badRequestResponse, BD_CURRENT_DATE, BD_CURRENT_TIME, convertTo24Hour, formatQuantityNumber, isValid24h, notFoundResponse, saveNotificationToDB, somethingWentWrong, successResponse, toMinutes } from "../../utils/utils.js";
import { Vote } from "../../models/Community/VoteModel.js";
import { getPeriodBasicInsightsService, getPeriodBasicInsightsServiceV2 } from "../../services/periodTrackService.js";
import { previousPeriodsInfoService } from "../Period/trackPeriod/trackPeriod.js";
import { UserSelfTest } from "../../models/SelfTest/selfTestUserMode.js";
import Notification from "../../models/Notification/NotificationModel.js";

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const { fullName, notificationPreferenceDate, email, phoneNumber, autoReminderLimit, notificationPreferenceTime, dateOfBirth } = req.body;

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
      return successResponse(res, user, `Dr. ${isDoctorExist.fullName} is already in the wish list.`, `Dr. ${isDoctorExist.fullName} is already in the wish list.`);
    } else {
      user.doctorWishList.push(doctorUserId);
    }

    const updatedUser = await user.save();
    return successResponse(res, updatedUser, "Wish list updated successfully.", "Wish list updated successfully.");
  } catch (error) {
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const removeFromWishList = async (req, res) => {
  try {
    const { userId } = req.params;
    const { doctorUserId } = req.body;

    // 1. Verify doctor exists (using cleaner $ne query)
    const isDoctorExist = await User.findOne({
      userId: doctorUserId,
      type: 1,
      isRemoved: { $ne: true },
    });

    if (!isDoctorExist) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // 2. Find user
    const user = await User.findOne({
      userId,
      type: 0,
      isRemoved: { $ne: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 3. Check if doctor is in list
    const exists = user.doctorWishList.includes(doctorUserId);
    if (!exists) {
      return badRequestResponse(res, `Dr. ${isDoctorExist.fullName} is not in your wish list.`, `Dr. ${isDoctorExist.fullName} is not in your wish list.`);
    }

    // 4. Remove from list
    user.doctorWishList = user.doctorWishList.filter((id) => id !== doctorUserId);

    // 5. Save and return updated user
    const updatedUser = await user.save();

    return successResponse(res, updatedUser, "Doctor removed from wish list successfully.", "Doctor removed from wish list successfully.");
  } catch (error) {
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getUserDoctorWishList = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId, type: 0 }, { doctorWishList: 1 });

    if (!user) {
      return notFoundResponse(res, "User not found.", "User not found.");
    }

    // If wishlist is empty
    if (!user.doctorWishList || user.doctorWishList.length === 0) {
      return successResponse(res, [], "Wish list fetched successfully.", "Wish list fetched successfully.");
    }

    const doctors = await User.find({
      userId: { $in: user.doctorWishList },
      type: 1,
      isRemoved: false,
    })
      // .select("userId fullName email phoneNumber doctorRegistrationNumber currentWorkplace profilePhoto")
      .select("location profilePhoto currentWorkplace specialties qualifications fullName currentDesignation doctorRegistrationNumber  email isVerified currentWorkplace userId createdAt updatedAt isRemoved")
      .lean();

    return successResponse(res, doctors, "Wish list fetched successfully.", "Wish list fetched successfully.");
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
      .select("location profilePhoto currentWorkplace specialties qualifications fullName currentDesignation doctorRegistrationNumber  email isVerified currentWorkplace userId createdAt updatedAt isRemoved")
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
        message: ENV == "dev" ? "userId, doctorUserId, appointmentDate, startTime, endTime are required." : "Necessary fields are missing.",
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

    const user = await User.findOne({ userId, type: 0, isRemoved: { $ne: true } });
    console.log("🚀 ~ userController.js:439 ~ bookAppointment ~ user:", user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const doctor = await User.findOne({ userId: doctorUserId, type: 1, isRemoved: { $ne: true } });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "The doctor not found.",
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

    const response = {
      doctor,
      user,
      appointment,
    };

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      data: response,
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

    const doctor = await User.findOne({ userId: appointment.doctorUserId, type: 1, isRemoved: { $ne: true } });

    if (!doctor) {
      return somethingWentWrong(res, null, "Unable to reschedule as doctor is no longer available now.", "Doctor not found in reschedule the user.");
    }

    const user = await User.findOne({
      userId: appointment.userId,
      type: 0,
      isRemoved: { $ne: true },
    });

    if (!user) {
      return badRequestResponse(res, "You are not authorized to reschedule the appointment.", "User not found in reschedule.");
    }

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

    const resolvedStart = isValid24h(startTime) ? startTime : isValid24h(endTime) ? startTime : convertTo24Hour(startTime) || convertTo24Hour(appointment.startTime);
    const resolvedEnd = isValid24h(endTime) ? endTime : convertTo24Hour(endTime) || convertTo24Hour(appointment.endTime);

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
    console.log("🚀 ~ userController.js:507 ~ editAppointment ~ updated:", updated._id)

    // For the User
    const notificationToUser = await sendNotificationToUser({
      userId: updated.userId,
      title: "Appointment Rescheduled",
      body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} has been rescheduled to ${updated.appointmentDate} at ${updated.startTime}.`,
      type: "patientAppointment",
      appointmentId: updated._id.toString(),
    });

    const noti1 = await saveNotificationToDB({
      userId: updated.userId,
      title: "Appointment Rescheduled",
      body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} has been rescheduled to ${updated.appointmentDate} at ${updated.startTime}.`,
      type: "patientAppointment",
      appointmentId: updated._id.toString(),
      autoReminderLimit: 1,
      notificationSendTime: BD_CURRENT_TIME,
      notificationSendDate: BD_CURRENT_DATE,
    });

    // For the Doctor
    const notificationToDoctor = await sendNotificationToUser({
      userId: doctor.userId,
      title: "Appointment Rescheduled",
      body: `Your appointment with ${user.fullName} on ${appointment.appointmentDate} has been rescheduled to ${updated.appointmentDate} at ${updated.startTime}.`,
      type: "doctorAppointment",
      appointmentId: updated._id.toString(),
    });

    const noti2 = await saveNotificationToDB({
      userId: doctor.userId,
      title: "Appointment Rescheduled",
      body: `Your appointment with ${user.fullName} on ${appointment.appointmentDate} has been rescheduled to ${updated.appointmentDate} at ${updated.startTime}.`,
      type: "doctorAppointment",
      appointmentId: updated._id.toString(),
      autoReminderLimit: 1,
      notificationSendTime: BD_CURRENT_TIME,
      notificationSendDate: BD_CURRENT_DATE,
    });

    return successResponse(res, updated, "Appointment updated successfully.", "Appointment updated successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.", "Something went wrong.");
  }
};

// export const deleteAppointment = async (req, res) => {
//   const { appointmentId } = req.params;
//   const { userId } = req.body;

//   try {
//     const appointment = await Appointment.findOne({
//       _id: appointmentId,
//       isDeleted: false,
//     });

//     if (!appointment) {
//       return res.status(404).json({
//         success: false,
//         message: "Appointment not found.",
//       });
//     }

//     if (appointment.status === "completed") {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot cancel a completed appointment.",
//       });
//     }

//     if (appointment.status === "cancelled") {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot cancel a cancelled appointment.",
//       });
//     }

//     //     const notificationToUser = await sendNotificationToUser({
//     //   userId: appointment.userId,
//     //   title: "Appointment Cancelled",
//     //   body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled.`,
//     //   type: "appointment",
//     // })

//     if (appointment.userId !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: "You are not authorized to cancel this appointment.",
//       });
//     } else {
//       const updated = await Appointment.findByIdAndUpdate(appointmentId, { $set: { isDeleted: true } }, { new: true, runValidators: true });

//       if (!updated) {
//         return res.status(500).json({
//           success: false,
//           message: "Something went wrong.",
//         });
//       } else {
//         updated.status = "cancelled";
//         await updated.save();

//         if (updated.status === "cancelled") {
//           const doctor = await User.findOne({ userId: updated.doctorUserId, type: 1, $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }] });

//           if (doctor) {
//             const user = await User.findOne({ userId: userId, type: 0, $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }] });
//             const notificationToUser = await sendNotificationToUser({
//               userId: doctor.userId,
//               title: "Appointment Cancelled",
//               body: `Your appointment with ${userId.fullName} on ${updated.appointmentDate} at ${updated.startTime} has been cancelled.`,
//               type: "doctorAppointment",
//             });

//             const noti = await saveNotificationToDB({
//               userId: doctor.userId,
//               notificationSendTime: BD_CURRENT_TIME,
//               notificationSendDate: BD_CURRENT_DATE,
//               autoReminderLimit: 1,

//               title: "Appointment Cancelled",
//               body: `Your appointment with ${userId.fullName} on ${updated.appointmentDate} at ${updated.startTime} has been cancelled.`,
//               type: "doctorAppointment",
//             });

//             return successResponse(res, updated, "Appointment cancelled successfully.", "Appointment cancelled successfully.");
//           } else {
//             updated.isDeleted = true;
//             await updated.save();
//             return successResponse(res, updated, "Appointment cancelled successfully.", "Appointment cancelled successfully.");
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error(error);
//     return somethingWentWrong(res, error, "Something went wrong.", "Something went wrong in deleting appointment by user.");
//   }
// };

// export const deleteAppointment2 = async (req, res) => {
//   const { appointmentId } = req.params;
//   const { cancelledBy, userId } = req.body; // "user" | "doctor" | "admin"

//   if (!["user", "doctor", "admin"].includes(cancelledBy)) {
//     return res.status(400).json({
//       success: false,
//       message: "cancelledBy must be 'user', 'doctor', or 'admin'.",
//     });
//   }

//   try {
//     const appointment = await Appointment.findOne({
//       _id: appointmentId,
//       isDeleted: false,
//     });

//     if (!appointment) {
//       return res.status(404).json({
//         success: false,
//         message: "Appointment not found.",
//       });
//     }

//     if (appointment.status === "completed") {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot cancel a completed appointment.",
//       });
//     }

//     if (appointment.status === "cancelled") {
//       return res.status(400).json({
//         success: false,
//         message: "Appointment is already cancelled.",
//       });
//     }

//     const userWhoCancelAppointment = await User.findOne({ userId });
//     const doctor = await User.findOne({ userId: appointment.doctorUserId, type: 1, isRemoved: false });
//     const user = await User.findOne({ userId: appointment.userId, type: 0, isRemoved: false });

//     if (!userWhoCancelAppointment) {
//       return notFoundResponse(res, "User not found.", `User not found with id ${userWhoCancelAppointment.userId}`);
//     }

//     //!deleted by user

//     if (cancelledBy == "user") {
//       if (!user) {
//         appointment.status = "cancelled";
//         await appointment.save();
//         return res.status(404).json({
//           success: false,
//           message: "User not found.",
//         });
//       }

//       if (!doctor) {
//         appointment.status = "cancelled";
//         await appointment.save();
//         doctor.isRemoved = true;
//         await doctor.save();
//         return badRequestResponse(res, "This doctor is not available.", "Doctor is missing to cancel this appointment");
//       }

//       const notificationToUser = await sendNotificationToUser({
//         userId: appointment.userId,
//         title: "Appointment Cancelled",
//         body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled.`,
//         type: "appointment",
//       });

//       const notificationToDoctor = await sendNotificationToUser({
//         userId: appointment.doctorUserId,
//         title: "Appointment Cancelled",
//         body: `Your appointment with ${userWhoCancelAppointment.fullName} on ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled.`,
//         type: "appointment",
//       });
//     }

//     //!deleted by admin
//     if (cancelledBy == "admin") {
//       if (!doctor) {
//         const notificationToUser = await sendNotificationToUser({
//           userId: appointment.userId,
//           title: "Appointment Cancelled",
//           body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} from ${appointment.startTime} to ${appointment.endTime} has been cancelled.`,
//           type: "appointment",
//         });

//         return res.status(404).json({
//           success: false,
//           message: "Doctor not found.",
//         });
//       }

//       if (!user) {
//         const notificationToUser = await sendNotificationToUser({
//           userId: appointment.doctorUserId,
//           title: "Appointment Cancelled",
//           body: `Your appointment on ${appointment.appointmentDate} from ${appointment.startTime} to ${appointment.endTime} has been cancelled.`,
//           type: "appointment",
//         });

//         return res.status(404).json({
//           success: false,
//           message: "User not found.",
//         });
//       }

//       const notificationToUser = await sendNotificationToUser({
//         userId: appointment.userId,
//         title: "Appointment Cancelled",
//         body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} from ${appointment.startTime} to ${appointment.endTime} has been cancelled.`,
//         type: "appointment",
//       });

//       const notificationToDoctor = await sendNotificationToUser({
//         userId: appointment.doctorUserId,
//         title: "Appointment Cancelled",
//         body: `Your appointment with Dr. ${user.fullName} on ${appointment.appointmentDate} has been cancelled by admin.`,
//         type: "appointment",
//       });
//     }

//     const updated = await Appointment.findByIdAndUpdate(
//       appointmentId,
//       {
//         $set: {
//           status: "cancelled",
//           cancelledBy,
//           isDeleted: true,
//         },
//       },
//       { new: true },
//     );

//     return successResponse(res, updated, "Appointment cancelled successfully.", "Appointment cancelled successfully.");
//   } catch (error) {
//     console.error(error);
//     return somethingWentWrong(res, error, "Something went wrong.");
//   }
// };

export const getUserAppointments = async (req, res) => {
  const { userId } = req.params;

  try {
    const appointments = await Appointment.find({
      userId,
      isDeleted: false,
    }).lean();

    const doctorIds = [...new Set(appointments.map((a) => a.doctorUserId))];

    const doctors = await User.find({
      userId: { $in: doctorIds },
    }).lean();

    const doctorMap = new Map(doctors.map((doctor) => [doctor.userId, doctor]));

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

    return successResponse(res, enrichedAppointments, "Appointments retrieved successfully.", "Get appointments successful.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getUserAppointmentsByStatus = async (req, res) => {
  const { userId } = req.params;
  let status;
  if (req.body?.status) {
    status = req.body.status;
  }

  try {
    let appointments;

    if (!status) {
      appointments = await Appointment.find({
        userId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      appointments = await Appointment.find({
        userId,
        status,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    const doctorIds = [...new Set(appointments.map((a) => a.doctorUserId))];

    const doctors = await User.find({
      userId: { $in: doctorIds },
    }).lean();

    const doctorMap = new Map(doctors.map((doctor) => [doctor.userId, doctor]));

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

    return successResponse(res, enrichedAppointments, "Appointments retrieved successfully.", "Get appointments successful.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getDailyScheduleByUser = async (req, res) => {
  const { doctorUserid: userId } = req.params;
  const { date } = req.body;
  const day = new Date(date).getDay();

  const dateStringWithoutTime = date.split("T")[0];

  try {
    const dayNumber = Number(day);
    const dayKey = DayMap[dayNumber];

    if (!dayKey) {
      return res.status(400).json({
        success: false,
        message: "Invalid day",
      });
    }

    const isDoctorExist = await User.findOne({ userId, type: 1 });

    if (!isDoctorExist) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    const dailySchedule = await ExceptionalDays.findOne({
      doctorUserId: userId,
      date: dateStringWithoutTime, // Matches the target date record specifically
    });

    if (dailySchedule) {
      return successResponse(res, dailySchedule, "Schedule fetched successfully.", "Schedule fetched successfully.");
    }

    const weeklySchedule = await WeeklyDays.findOne(
      { doctorUserId: userId },
      { [dayKey]: 1, doctorUserId: 1 }, // Projection: 1 means include, exclude everything else
    );

    if (!weeklySchedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found for this doctor on this day.",
      });
    }
    const daySchedule = weeklySchedule[dayKey];

    if (daySchedule) {
      return successResponse(res, daySchedule, "Schedule fetched successfully.", "Schedule fetched successfully.");
    }

    return res.status(404).json({
      success: false,
      message: "Schedule not found",
    });
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Failed to fetch schedule");
  }
};

export const completeAppointmentByUser = async (req, res) => {
  const { userId } = req.params;
  const { appointmentId } = req.body;

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        isDeleted: false,
        status: "confirmed",
      },
      {
        $set: {
          status: "completed",
        },
      },
      {
        new: true,
      },
    );

    if (!appointment) {
      return res.status(400).json({
        success: false,
        message: "Appointment is not found.",
      });
    }

    return successResponse(res, appointment, "Appointment completed successfully.", "Appointment completed successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const cancelAppointmentByUser = async (req, res) => {
  const { userId } = req.params;
  const { appointmentId } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment || appointment.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Appointment is not found.",
      });
    }

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "Only pending or confirmed appointments can be cancelled.",
      });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          status: "cancelled",
          cancelledBy: "user",
        },
      },
      { new: true },
    );

    const user = await User.findOne({
      userId: userId,
      type: 0,
      $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
    });

    const doctor = await User.findOne({
      userId: appointment.doctorUserId,
      type: 1,
      $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
    });

    // Notify user
    await sendNotificationToUser({
      userId: user.userId,
      title: "Appointment Cancelled",
      body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled.`,
      type: "patientAppointment",
      appointmentId: appointment._id.toString(),
    });

    // Notify doctor
    await sendNotificationToUser({
      userId: doctor.userId,
      title: "Appointment Cancelled",
      body: `Your appointment with ${user.fullName} on ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled.`,
      type: "doctorAppointment",
      appointmentId: appointment._id.toString(),
    });

    // ── Cancel matching pending reminder notifications ───────────────────────
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matchRegex = new RegExp(`${escapeRegex(doctor.fullName)}.*${escapeRegex(appointment.startTime)}.*${escapeRegex(appointment.endTime)}`);

    const pendingReminders = await Notification.find({
      userId: user.userId,
      type: "patientAppointment",
      isSent: false,
      body: matchRegex,
    });

    if (pendingReminders.length) {
      await Notification.updateMany(
        { _id: { $in: pendingReminders.map((n) => n._id) } },
        {
          $set: {
            isSent: true,
            title: "Appointment Cancelled",
            body: `Your appointment with Dr. ${doctor.fullName} on ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled.`,
          },
        },
      );
    }

    return successResponse(res, appointment, "Appointment cancelled successfully.", "Appointment cancelled successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const rateDoctorByUser = async (req, res) => {
  const { userId } = req.params;
  const { appointmentId, rating, review } = req.body;

  if (rating > 5 && rating <= 0) {
    return badRequestResponse(res, "Bad rating request.", `Rating must be between 1 and 5 but the user's rating is ${rating}.`);
  }

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(appointmentId),
        isDeleted: false,
        status: "completed",
      },
      {
        $set: {
          rating: rating,
        },
      },
      {
        new: true,
      },
    );

    if (!appointment) {
      return res.status(400).json({
        success: false,
        message: "Appointment is not found.",
      });
    }

    const rate = await DoctorRatingModel.create({
      userId,
      doctorUserId: appointment.doctorUserId,
      rating,
      appointmentId: appointment._id.toString(),
    });

    const ratingStats = await DoctorRatingModel.aggregate([
      {
        $match: {
          doctorUserId: appointment.doctorUserId,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: ["$averageRating", 1] },
          totalRatings: 1,
        },
      },
    ]);
    console.log("🚀 ~ userController.js:994 ~ rateDoctorByUser ~ ratingStats:", ratingStats);

    const user = await User.findOne({ userId });

    const doctor = await User.findOneAndUpdate(
      { userId: appointment.doctorUserId, type: 1, isVerified: true, isRemoved: false },
      {
        $set: {
          rating: ratingStats[0].averageRating,
          totalRatings: ratingStats[0].totalRatings,
        },
      },
    );

    const finalResponse = await DoctorRatingModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(rate._id),
      },
      {
        $set: {
          doctorName: doctor.fullName,
          doctorProfilePhoto: doctor.profilePhoto,
          userId,
          review: review,
          hospitalName: doctor.currentWorkplace,
          doctorLocation: doctor.location,
          appointmentId: appointment._id,
          userId: user._id,
          userName: user.fullName,
          userProfilePhoto: user.profilePhoto,
        },
      },
      {
        new: true,
      },
    );

    return successResponse(res, finalResponse, "Thank you for your rating.", "Rating completed successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getAllUserInspectListByAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "fullName", // fullName | userId | createdAt
      sortOrder = "asc", // asc | desc
    } = req.body;

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const skip = (pageNumber - 1) * limitNumber;

    // Base filter
    const match = {
      type: 0,
      isRemoved: false,
    };

    // Search
    // Search
    if (search?.trim()) {
      const keyword = search.trim();

      match.$or = [
        {
          fullName: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          userId: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          email: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          phoneNumber: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    // Allowed sort fields
    const allowedSortFields = ["fullName", "userId", "createdAt"];

    const sort = {
      [allowedSortFields.includes(sortBy) ? sortBy : "fullName"]: sortOrder === "desc" ? -1 : 1,
    };

    const [users, totalCount] = await Promise.all([
      User.aggregate([
        { $match: match },
        { $sort: sort },
        { $skip: skip },
        { $limit: limitNumber },
        {
          $project: {
            _id: 0,
            fullName: 1,
            userId: 1,
            profilePhoto: 1,
            createdAt: 1,
            email: 1,
            phoneNumber: 1,
            autoReminderLimit: 1,
            notificationPreferenceTime: 1,
            dateOfBirth: 1,
          },
        },
      ]),
      User.countDocuments(match),
    ]);

    return successResponse(
      res,
      {
        users,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNumber),
        },
      },
      "User list fetched successfully.",
      "User list fetched successfully.",
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getUserInspectsDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({
      userId,
      type: 0,
      isRemoved: false,
    });

    if (!user) {
      return notFoundResponse(res, "User not found.", "User not found.");
    }

    const [voteStats, totalComments, totalReplies, periodInsights,periodSixMonthInsights, previousPeriods] = await Promise.all([
      Vote.aggregate([
        {
          $match: {
            userId,
          },
        },
        {
          $group: {
            _id: null,
            totalVotes: { $sum: 1 },
            totalUpvotes: {
              $sum: {
                $cond: [{ $eq: ["$type", "upvote"] }, 1, 0],
              },
            },
            totalDownvotes: {
              $sum: {
                $cond: [{ $eq: ["$type", "downvote"] }, 1, 0],
              },
            },
          },
        },
      ]),

      Comment.countDocuments({
        userId,
        parentId: null,
      }),

      Comment.countDocuments({
        userId,
        parentId: { $ne: null },
      }),

      getPeriodBasicInsightsService(userId),
      getPeriodBasicInsightsServiceV2(userId),
      previousPeriodsInfoService(userId),
    ]);

    const statistics = {
      totalVotes: voteStats[0]?.totalVotes || 0,
      totalUpvotes: voteStats[0]?.totalUpvotes || 0,
      totalDownvotes: voteStats[0]?.totalDownvotes || 0,
      totalComments,
      totalReplies,
    };

    return successResponse(
      res,
      {
        ...user.toObject(),
        statistics,
        periodInsights: periodInsights.data,
        periodSixMonthInsights: periodSixMonthInsights.data,
        previousPeriods: previousPeriods,
      },
      "User details fetched successfully.",
      "User details fetched successfully.",
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getUserSpecificSelfTest = async (req, res) => {
  try {
    const { userId } = req.params;

    const userSelfTest = await UserSelfTest.find({ userId });

    if (!userSelfTest) {
      return notFoundResponse(res, "User self test not found.", "User self test not found.");
    }

    return successResponse(res, userSelfTest, "User self test details fetched successfully.", "User self test details fetched successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getUserSpecificAllAppointments = async (req, res) => {
  try {
    const { userId } = req.params;

    const { page = 1, limit = 10, search = "", status, sortBy = "appointmentDate", sortOrder = "desc" } = req.body;

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const skip = (pageNumber - 1) * limitNumber;

    const match = {
      userId,
      isDeleted: false,
    };

    // Filter by appointment status
    if (status && status !== "all") {
      match.status = status;
    }

    const pipeline = [
      {
        $match: match,
      },

      // Join doctor
      {
        $lookup: {
          from: "doctors", // collection name of Doctor model
          localField: "doctorUserId",
          foreignField: "userId",
          as: "doctor",
        },
      },

      {
        $unwind: {
          path: "$doctor",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Search
    if (search.trim()) {
      pipeline.push({
        $match: {
          $or: [
            {
              "doctor.fullName": {
                $regex: search.trim(),
                $options: "i",
              },
            },
            {
              "doctor.email": {
                $regex: search.trim(),
                $options: "i",
              },
            },
            {
              "doctor.phoneNumber": {
                $regex: search.trim(),
                $options: "i",
              },
            },
            {
              doctorUserId: {
                $regex: search.trim(),
                $options: "i",
              },
            },
          ],
        },
      });
    }

    const allowedSortFields = ["appointmentDate", "startTime", "endTime", "status", "createdAt"];

    pipeline.push({
      $sort: {
        [allowedSortFields.includes(sortBy) ? sortBy : "appointmentDate"]: sortOrder === "asc" ? 1 : -1,
      },
    });

    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limitNumber },

          {
            $project: {
              doctor: {
                userId: "$doctor.userId",
                fullName: "$doctor.fullName",
                profilePhoto: "$doctor.profilePhoto",
                email: "$doctor.email",
                phoneNumber: "$doctor.phoneNumber",
                currentDesignation: "$doctor.currentDesignation",
                currentWorkplace: "$doctor.currentWorkplace",
                specialties: "$doctor.specialties",
                rating: "$doctor.rating",
                totalRateCount: "$doctor.totalRateCount",
              },

              appointmentDate: 1,
              startTime: 1,
              endTime: 1,
              status: 1,
              rating: 1,
              cancelledBy: 1,
              note: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],

        totalCount: [{ $count: "count" }],
      },
    });

    const result = await Appointment.aggregate(pipeline);

    const appointments = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return successResponse(
      res,
      {
        appointments,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
      "User appointments fetched successfully.",
      "User appointments fetched successfully.",
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};




export const getUserSpecificAppointmentDetailsByPatient = async (req, res) => {
  try {
    const {  appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId).lean();
    if (!appointment) {
      return notFoundResponse(res, "Appointment not found.", "Appointment not found.");
    }
    const user = await User.findOne({ userId: appointment.userId, type: 0 }).lean();
    const doctor = await User.findOne({ userId: appointment.doctorUserId, type: 1 }).lean();

    return successResponse(
      res,
      {
        appointment,
        user,
        doctor,
      },
      "User appointment details fetched successfully.",
      "User appointment details fetched successfully."
    );
  }
  catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
}


export const getUserSpecificAppointmentsByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      userId,
      isDeleted: false,
    };

    const [appointments, total] = await Promise.all([
      Appointment.aggregate([
        {
          $match: filter,
        },

        {
          $sort: {
            appointmentDate: -1,
            startTime: -1,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: limit,
        },

        {
          $lookup: {
            from: "doctors", // collection name
            localField: "doctorUserId",
            foreignField: "userId",
            as: "doctor",
          },
        },

        {
          $unwind: {
            path: "$doctor",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            userId: 1,
            doctorUserId: 1,
            appointmentDate: 1,
            startTime: 1,
            endTime: 1,
            status: 1,
            rating: 1,
            note: 1,
            cancelledBy: 1,
            createdAt: 1,

            doctor: {
              userId: "$doctor.userId",
              fullName: "$doctor.fullName",
              profilePhoto: "$doctor.profilePhoto",
              rating: "$doctor.rating",
              totalRateCount: "$doctor.totalRateCount",
              specialties: "$doctor.specialties",
              currentDesignation: "$doctor.currentDesignation",
              currentWorkplace: "$doctor.currentWorkplace",
              location: "$doctor.location",
              qualifications: "$doctor.qualifications",
            },
          },
        },
      ]),

      Appointment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};
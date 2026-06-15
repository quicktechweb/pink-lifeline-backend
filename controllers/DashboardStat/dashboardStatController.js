import { somethingWentWrong, successResponse } from "../../utils/utils.js";
import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { Appointment } from "../../models/Schedule/userBooking.js";

export const getDoctorPatientAppointmentCounts = async (req, res) => {
  const users = await User.find({ isRemoved: false }, { isVerified: 1, type: 1 }).lean();
  const appointments = await Appointment.find({ isDeleted: false, status: "completed" }, { status: 1 }).lean();

  if (!users) {
    return notFoundResponse(res, "No Users found.", "Get all user failed: empty result.");
  } else {
    const doctors = users.filter((user) => user.type === 1 && user.isVerified === true);
    const patients = users.filter((user) => user.type === 0);

    return successResponse(
      res,
      {
        doctors: doctors.length,
        patients: patients.length,
        appointments: appointments.length,
        users: users.length,
      },
      "Users retrieved successfully",
      "Get all doctors successful.",
    );
  }

  return successResponse(res, { doctors }, "Doctors retrieved successfully", "Get all doctors successful.");
};

export const getAppointmentStatusPieChartData = async (req, res) => {
  try {
    const appointments = await Appointment.find({ isDeleted: false }).lean();
    const completedAppointments = appointments.filter((appointment) => appointment.status === "completed");
    const pendingAppointments = appointments.filter((appointment) => appointment.status === "pending");
    const cancelledAppointments = appointments.filter((appointment) => appointment.status === "cancelled");
    const confirmedAppointments = appointments.filter((appointment) => appointment.status === "confirmed");

    return successResponse(
      res,
      {
        completedAppointments: completedAppointments.length,
        pendingAppointments: pendingAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        confirmedAppointments: confirmedAppointments.length,
        totalAppointments: appointments.length,
      },
      "Appointments retrieved successfully",
      "Get all appointments successful.",
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getAppointmentTrendsOverTime = async (req, res) => {
  try {
    const trends = await Appointment.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          confirmed: {
            $sum: {
              $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          pending: 1,
          confirmed: 1,
          completed: 1,
          cancelled: 1,
          total: 1,
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ]);

    return successResponse(res, trends, "Appointment trends retrieved successfully", "Get appointment trends successful.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

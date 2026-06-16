import { somethingWentWrong, successResponse } from "../../utils/utils.js";
import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { Appointment } from "../../models/Schedule/userBooking.js";
import PeriodModel from "../../models/Period/PeriodModel.js";
export const getDoctorPatientAppointmentCounts = async (req, res) => {
  const users = await User.find({ isRemoved: false }, { isVerified: 1, type: 1 }).lean();
  const appointments = await Appointment.find({ isDeleted: false, status: "completed" }, { status: 1 }).lean();

  if (!users) {
    return notFoundResponse(res, "No Users found.", "Get all user failed: empty result.");
  } else {
    const doctors = users.filter((user) => user.type === 1 && user.isVerified === true);
    const normalUsers = users.filter((user) => user.type === 0);

    return successResponse(
      res,
      {
        doctors: doctors.length,
        normalUsers: patients.length,
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
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "year and month are required",
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const trends = await Appointment.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
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
          total: {
            $sum: 1,
          },
        },
      },
    ]);

    // Convert aggregation result into lookup object
    const trendMap = {};

    trends.forEach((item) => {
      trendMap[item._id] = {
        pending: item.pending,
        confirmed: item.confirmed,
        completed: item.completed,
        cancelled: item.cancelled,
        total: item.total,
      };
    });

    // Generate all days of the month
    const daysInMonth = new Date(year, month, 0).getDate();

    const result = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);

      const dateString = currentDate.toISOString().split("T")[0];

      result.push({
        date: dateString,
        // timestamp: currentDate.getTime(),
        pending: trendMap[dateString]?.pending || 0,
        confirmed: trendMap[dateString]?.confirmed || 0,
        completed: trendMap[dateString]?.completed || 0,
        cancelled: trendMap[dateString]?.cancelled || 0,
        total: trendMap[dateString]?.total || 0,
      });
    }

    return successResponse(res, result, "Appointment trends retrieved successfully", "Get appointment trends successful.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getTopDoctorServedPatients = async (req, res) => {
  try {
    const topDoctors = await Appointment.aggregate([
      {
        $match: {
          isDeleted: false,
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$doctorUserId",
          totalAppointments: { $sum: 1 },
        },
      },
      {
        $sort: {
          totalAppointments: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "doctors", // collection name
          localField: "_id",
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
          _id: 0,

          doctorUserId: "$doctor.userId",
          fullName: "$doctor.fullName",
          profilePhoto: "$doctor.profilePhoto",

          currentDesignation: "$doctor.currentDesignation",
          currentWorkplace: "$doctor.currentWorkplace",
          phoneNumber: "$doctor.phoneNumber",
          email: "$doctor.email",
          location: "$doctor.location",
          specialties: "$doctor.specialties",

          score: "$doctor.score",

          totalAppointments: 1,
        },
      },
    ]);

    console.log("🚀 ~ dashboardStatController.js:180 ~ getTopDoctorServedPatients ~ topDoctors:", topDoctors);

    return successResponse(res, topDoctors, "Top doctors served patients retrieved successfully", "Get top doctors served patients successful.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const allUserPeriodCycleLength = async (req, res) => {
  try {
    const allPeriodData = await PeriodModel.find(
      {},
      {
        userId: 1,
        startDate: 1,
      },
    ).lean();

    // Group by userId
    const groupedUsers = {};

    for (const record of allPeriodData) {
      if (!record.startDate) continue;

      if (!groupedUsers[record.userId]) {
        groupedUsers[record.userId] = [];
      }

      groupedUsers[record.userId].push(record);
    }

    const result = [];

    for (const [userId, periods] of Object.entries(groupedUsers)) {
      // sort by startDate ascending
      periods.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      const cycleLengths = [];

      for (let i = 1; i < periods.length; i++) {
        const previousStartDate = new Date(periods[i - 1].startDate);
        const currentStartDate = new Date(periods[i].startDate);

        const diffInDays = Math.round((currentStartDate - previousStartDate) / (1000 * 60 * 60 * 24));

        cycleLengths.push(diffInDays);
      }

      const averageCycleLength = cycleLengths.length > 0 ? Number((cycleLengths.reduce((sum, value) => sum + value, 0) / cycleLengths.length).toFixed(2)) : 0;

      result.push({
        userId,
        totalPeriods: periods.length,
        averageCycleLength,
        cycleLengths,
      });
    }

    return successResponse(res, result, "Period cycle lengths calculated successfully", "Success");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};



export const getAllDoctorPatientsRatio = async ( req, res ) => {

    try {
        const users = await User.find({ isRemoved: false }, { isVerified: 1, type: 1 }).lean();
        const patients = await Appointment.aggregate([
                                                        {
                                                          $match: {
                                                            isDeleted: false,
                                                            status: {
                                                              $ne: "completed",
                                                            },
                                                          },
                                                        },
                                                        {
                                                          $group: {
                                                            _id: "$userId",
                                                          },
                                                        },
                                                      ]);
                                                          
        if (!users) {
          return notFoundResponse(res, "No Users found.", "Get all user failed: empty result.");
        } else {
          const doctors = users.filter((user) => user.type === 1 && user.isVerified === true);
          const normalUsers = users.filter((user) => user.type === 0);
    
          return successResponse(
            res,
            {
              doctors: doctors.length,
              patients: patients.length,
              users: users.length,
            },
            "Users retrieved successfully",
            "Get all users successful."
          );
        }
      } catch (error) {
        console.error(error);
    
        return somethingWentWrong(res, error, "Failed to get users.", "Get all users error");
      }
}


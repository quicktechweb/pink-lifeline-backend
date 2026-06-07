import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { nanoid } from "nanoid";
import axios from "axios";
import { generateToken } from "../../utils/token.js";
import { badRequestResponse, notFoundResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";
import { DayMap, MonthMap } from "../../constant/constant.js";
import { ExceptionalDays, WeeklyDays } from "../../models/Schedule/doctorSchedule.js";

const generateUserId = (type) => {
  const id = nanoid(6).toUpperCase();
  return type === "doctor" ? `DOC-${id}` : `USR-${id}`;
};

const IMGBB_API_KEY = "61b3c68f784244053d3df422e1c17879";

const uploadToImgBB = async (file) => {
  try {
    const base64Image = file.buffer.toString("base64");

    const url = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

    const formData = new URLSearchParams();
    formData.append("image", base64Image);

    const res = await axios.post(url, formData);

    return {
      url: res.data.data.url,
      delete_url: res.data.data.delete_url,
    };
  } catch (error) {
    console.error("ImgBB Upload Error:", error.response?.data || error.message);
    return null;
  }
};

// export const registerUser = async (req, res) => {
//   try {
//     // 🔥 parse qualifications
//     if (req.body.qualifications) {
//       req.body.qualifications = JSON.parse(req.body.qualifications);
//     }

//     const {
//       type,
//       fullName,
//       email,
//       phoneNumber,
//       doctorRegistrationNumber,
//       currentWorkplace,
//       currentDesignation,
//       aboutMe,
//       qualifications,
//     } = req.body;

//     // 🔍 Check existing user
//     const existing = await User.findOne({
//       $or: [{ phoneNumber }, { email }],
//     });

//     if (existing) {
//       return res.status(200).json({
//         success: false,
//         message: existing.email === email
//           ? "User already exists with this email"
//           : "User already exists with this phone number",
//       });
//     }

//     // 🔥 Upload image to ImgBB
//     let doctorIdCardData = {};

//     if (req.file) {
//       const uploaded = await uploadToImgBB(req.file);

//       if (uploaded) {
//         doctorIdCardData = {
//           url: uploaded.url,
//           deleteUrl: uploaded.delete_url,
//         };
//       }
//     }

//     // 🔥 Generate userId
//     const userId = generateUserId(type);

//     // 🧠 Create user
//     const newUser = await User.create({
//       userId,
//       type,
//       fullName,
//       email,
//       phoneNumber,
//       doctorRegistrationNumber,
//       currentWorkplace,
//       currentDesignation,
//       aboutMe,
//       qualifications,
//       doctorIdCard: doctorIdCardData,
//     });

//     // 🔐 JWT TOKEN GENERATE
//     const token = generateToken(newUser);

//     return res.status(200).json({
//       success: true,
//       message: "Registration successful",
//       token, // 🔥 JWT ADDED
//       data: newUser,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(200).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const registerUser = async (req, res) => {
  try {
    let {
      type, // 1 = doctor, 0 = user
      fullName,
      email,
      phoneNumber,
      doctorRegistrationNumber,
      isVerified,
      currentWorkplace,
      currentDesignation,
      aboutMe,
      qualifications,
      doctorIdCard,
    } = req.body;

    if (type === undefined || (Number(type) !== 0 && Number(type) !== 1)) {
      return badRequestResponse(res, "User type is required.", "User type is not found.");
    }

    if (typeof qualifications === "string") {
      qualifications = JSON.parse(qualifications);
    }

    let conditions = [];

    // if (phoneNumber) {
    //   conditions.push({ phoneNumber });
    // }

    if (email) {
      conditions.push({ email });
    }

    // if (type === 1 && !phoneNumber) {
    //   badRequestResponse(res, "Phone Number is required for doctor registration.", "Phone number is not found.");
    //   return;
    // }

    // if (phoneNumber) {
    //   const phoneExists = await User.findOne({ phoneNumber });

    //   if (phoneExists) {
    //     return res.status(200).json({
    //       success: false,
    //       message: "User already exists with this phone number" + (phoneExists.type === 1 ? " as a doctor" : " as a user"),
    //     });
    //   }
    // }

    // 🔍 check existing
    const existing = await User.findOne({
      $or: conditions,
    });

    if (existing && existing.email === email) {
      return res.status(200).json({
        success: false,
        message: "User already exists with this email" + (existing.type === 1 ? " as a doctor" : " as a user"),
      });
    }

    // 🔥 ROLE LOGIC (MAIN FIX)
    const isDoctor = Number(type) === 1 ? 1 : 0;
    const isUser = Number(type) === 1 ? 0 : 1;

    // 🔥 upload image
    let doctorIdCardData = {};

    // if (req.file) {
    //   const uploaded = await uploadToImgBB(req.file);

    //   if (uploaded) {
    //     doctorIdCardData = {
    //       url: uploaded.url,
    //       deleteUrl: uploaded.delete_url,
    //     };
    //   }
    // }

    // 🔥 generate userId
    const userId = generateUserId(type);

    // 🧠 create user
    const newUser = await User.create({
      userId,
      type: Number(type),
      fullName,
      email,
      phoneNumber: phoneNumber ? phoneNumber : null,
      doctorRegistrationNumber: doctorRegistrationNumber ? doctorRegistrationNumber : null,
      currentWorkplace: currentWorkplace ? currentWorkplace : null,
      currentDesignation: currentDesignation ? currentDesignation : null,
      aboutMe: aboutMe ? aboutMe : null,
      qualifications: qualifications ? qualifications : null,
      doctorIdCard: doctorIdCard ? doctorIdCard : null,
      isDoctor,
      isUser,
      isRemoved: false,
      isVerified: isVerified ? isVerified : false,
    });

    // 🔐 JWT token
    const token = generateToken(newUser);

    // 🎯 clean response (ONLY ONE FLAG SHOW)
    const responseUser = {
      _id: newUser._id,
      userId: newUser.userId,
      type: newUser.type,
      fullName: newUser.fullName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber || null,
      doctorRegistrationNumber: newUser.doctorRegistrationNumber || null,
      currentWorkplace: newUser.currentWorkplace || null,
      currentDesignation: newUser.currentDesignation || null,
      aboutMe: newUser.aboutMe || null,
      qualifications: newUser.qualifications || null,
      doctorIdCard: newUser.doctorIdCard || null,
      isVerified: newUser.isVerified || false,
      ...(Number(type) === 1 ? { isDoctor: 1 } : { isUser: 0 }),
    };

    return res.status(200).json({
      success: true,
      message: "Registration successful",
      token,
      data: responseUser,
    });
  } catch (error) {
    console.error(error);

    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email } = req.body;

    // 🔍 check user by email only
    const user = await User.findOne({ email });

    // ❌ not found
    if (!user) {
      return res.status(200).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // 🔐 generate token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: user,
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginadmin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      phoneNumber: identifier.trim(),
      newpartroles: "SUPERadmin",
    }).lean();

    // ❌ no user
    if (!user) {
      return res.status(200).json({
        success: false,
        message: "Admin account not found",
      });
    }

    console.log("USER:", user);
    console.log("DB PASS:", user.password);
    console.log("ENTER PASS:", password);

    // compare
    const dbPassword = user.password?.trim();
    const enteredPassword = password?.trim();

    if (dbPassword !== enteredPassword) {
      return res.status(200).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      user,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  let { phoneNumber, isVerified, type, aboutMe, doctorRegistrationNumber, currentWorkplace, currentDesignation, qualifications } = req.body;

  const { userId } = req.params;

  try {
    /* =========================
       VALIDATE TYPE
    ========================= */

    if (Number(type) === 0) {
      return badRequestResponse(res, "Only doctors can update doctor profile.", "Profile update failed: User is not a doctor.");
    }

    /* =========================
       PARSE QUALIFICATIONS
    ========================= */

    if (typeof qualifications === "string") {
      qualifications = JSON.parse(qualifications);
    }

    if (qualifications !== undefined && !Array.isArray(qualifications)) {
      return notFoundResponse(res, "Qualifications information is required", "Profile update failed: Qualifications data is missing.");
    }

    /* =========================
       REQUIRED FIELD
    ========================= */

    if (!doctorRegistrationNumber) {
      return notFoundResponse(res, "Doctor registration number is required", "Profile update failed: Doctor registration number is missing.");
    }

    const updateData = {};

    /* =========================
       COMMON FIELD
    ========================= */

    if (aboutMe !== undefined) {
      updateData.aboutMe = aboutMe;
    }

    /* =========================
       DOCTOR FIELDS
    ========================= */

    if (doctorRegistrationNumber !== undefined) {
      updateData.doctorRegistrationNumber = doctorRegistrationNumber;
    }

    if (currentWorkplace !== undefined) {
      updateData.currentWorkplace = currentWorkplace;
    }

    if (currentDesignation !== undefined) {
      updateData.currentDesignation = currentDesignation;
    }

    if (qualifications !== undefined) {
      updateData.qualifications = qualifications;
    }

    /* =========================
       PHONE VALIDATION
    ========================= */

    if (phoneNumber !== undefined) {
      const bdPhoneRegex = /^(\+8801|8801|01)[3-9]\d{8}$/;

      if (!bdPhoneRegex.test(phoneNumber)) {
        return badRequestResponse(res, "Invalid Phone number.", "Profile update failed: Phone number format is invalid.");
      }

      updateData.phoneNumber = phoneNumber;
    }

    /* =========================
       VERIFIED
    ========================= */

    if (isVerified === true || isVerified === "true") {
      updateData.isVerified = true;
    }

    /* =========================
       IMAGE UPLOAD
    ========================= */

    if (req.file) {
      const uploaded = await uploadToImgBB(req.file);

      if (uploaded) {
        updateData.doctorIdCard = {
          url: uploaded.url,
          deleteUrl: uploaded.delete_url,
        };
      }
    }

    /* =========================
       UPDATE USER
    ========================= */

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

    return successResponse(res, updatedUser, "Profile updated successfully.", "Doctor profile updated successfully.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to update profile", "Profile update error");
  }
};

export const getProfile = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId, $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }] }).lean();

    if (user) {
      return successResponse(res, user, "Profile information retrieved successfully", "Get profile information successful.");
    } else {
      return notFoundResponse(res, "User not found.", "Get profile failed: User not found.");
    }
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Failed to get profile information.", "Get profile error");
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({
      isDoctor: 1,
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

export const approveSingleDoctor = async (req, res) => {
  const { userId } = req.params;

  try {
    const doctor = await User.findOne({ userId, isRemoved: false });
    res.send(doctor);

    if (!doctor || doctor.isDoctor !== 1) {
      return notFoundResponse(res, "Doctor not found.", `Update failed: Doctor not found with userId ${userId}`);
    }

    doctor.isVerified = true;

    await doctor.save();

    return successResponse(res, doctor, "Doctor verified successfully", `Doctor verified: ${userId}`);
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to verify doctor.", "Verify doctor error");
  }
};

export const deleteDoctor = async (req, res) => {
  const { userId } = req.params;

  try {
    const doctor = await User.findOne({ userId });

    if (!doctor || doctor.isDoctor !== 1) {
      return notFoundResponse(res, "Doctor not found.", `Delete failed: Doctor not found with userId ${userId}`);
    }

    // Soft delete
    doctor.isRemoved = true;

    await doctor.save();

    return successResponse(res, doctor, "Doctor removed successfully.", `Doctor marked as removed: ${userId}`);
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to remove doctor.", "Delete doctor error");
  }
};

export const getDoctorByRegistrationNumber = async (req, res) => {
  const { doctorRegistrationNumber } = req.params;

  try {
    const doctor = await User.findOne({
      doctorRegistrationNumber,
      isDoctor: 1,
      $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
    }).lean();

    if (!doctor) {
      return notFoundResponse(res, "Doctor not found with this registration number.", `Get doctor failed: No doctor found with registration number ${doctorRegistrationNumber}`);
    }

    return successResponse(res, doctor, "Doctor retrieved successfully", `Get doctor by registration number successful: ${doctorRegistrationNumber}`);
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to get doctor information.", "Get doctor by registration number error");
  }
};

export const searchDoctors = async (req, res) => {
  const { query } = req.params;

  try {
    const doctors = await User.find({
      type: 1,
      $and: [
        {
          $or: [{ fullName: { $regex: query, $options: "i" } }, { phoneNumber: { $regex: query, $options: "i" } }, { doctorRegistrationNumber: { $regex: query, $options: "i" } }, { currentWorkplace: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
        },
        {
          $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
        },
      ],
    })
      .select("fullName phoneNumber doctorRegistrationNumber email currentWorkplace")
      .lean();

    if (!doctors.length) {
      return notFoundResponse(res, "No doctors found.", "Search doctors failed: empty result.");
    }

    return successResponse(res, doctors, "Doctors retrieved successfully", "Search doctors successful.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to search doctors.", "Search doctors error");
  }
};

export const addSchedule = async (req, res) => {
  const { userId } = req.params;
  const { startTime, endTime, maxAppointments = 20, day } = req.body;

  const dayNumber = Number(day);
  const dayKey = DayMap[dayNumber];

  // 1. Validate day
  if (!dayKey) {
    return res.status(400).json({
      success: false,
      message: "Invalid day (1-7 required)",
    });
  }

  // 2. Validate time
  if (!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "startTime and endTime are required",
    });
  }

  if (startTime >= endTime) {
    return res.status(400).json({
      success: false,
      message: "startTime must be before endTime",
    });
  }

  const schedule = {
    startTime,
    endTime,
    maxAppointments,
  };

  try {
    // 3. Check duplicate slot (IMPORTANT FIX)
    const existing = await WeeklyDays.findOne({
      doctorUserId: userId,
      [`${dayKey}.time`]: {
        $elemMatch: { startTime, endTime },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This time slot already exists",
      });
    }

    // 4. Safe update
    const updated = await WeeklyDays.findOneAndUpdate(
      { doctorUserId: userId },

      {
        $setOnInsert: { doctorUserId: userId },
        $set: { [`${dayKey}.isEnable`]: true },
        $push: { [`${dayKey}.time`]: schedule },
      },

      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Schedule added successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to add schedule",
    });
  }
};

export const removeSchedule = async (req, res) => {
  const { doctorUserId, day, startTime, endTime, maxAppointments } = req.body;

  const dayNumber = Number(day);
  const dayKey = DayMap[dayNumber];
  console.log("🚀 ~ doctorRegistration.js:726 ~ removeSchedule ~ dayKey:", dayKey);

  // 1. Validate day
  if (!dayKey) {
    return res.status(400).json({
      success: false,
      message: "Invalid day (1-7 required)",
    });
  }

  try {
    // 2. Check if doctor schedule exists
    const doctorSchedule = await WeeklyDays.findOne({
      doctorUserId,
    });

    if (!doctorSchedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const removingSlot = {
      startTime,
      endTime,
    };

    // 3. Remove exact slot
    const updated = await WeeklyDays.findOneAndUpdate(
      {
        doctorUserId,
      },

      {
        $pull: {
          [`${dayKey}.time`]: removingSlot,
        },
      },

      {
        new: true,
      },
    );

    // 4. Optional: disable day if no slots left
    const remainingSlots = updated?.[dayKey]?.time?.length || 0;

    const ifSlotExist = await WeeklyDays.findOne({
      doctorUserId,
      [`${dayKey}.isEnable`]: true,
    });

    if (!ifSlotExist) {
      return res.status(404).json({
        success: false,
        message: "Schedule slot not found",
      });
    }

    if (remainingSlots === 0) {
      await WeeklyDays.updateOne(
        { doctorUserId },
        {
          $set: {
            [`${dayKey}.isEnable`]: false,
          },
        },
      );
    }

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Schedule removed successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove schedule",
    });
  }
};


export const addExceptionalSchedule = async (req, res) => {
  const { date, startTime, endTime, maxAppointments=0 } = req.body;

  // 1. Validate required fields
  if (!date || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "date, startTime, and endTime are required",
    });
  }

  try {
    // 2. Parse date from Flutter and extract month
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    const monthNumber = parsedDate.getMonth() + 1; // getMonth() is 0-indexed
    const monthName = MonthMap[monthNumber];


    // 3. Check if an exceptional day already exists for this date
    const existingSchedule = await ExceptionalDays.findOne({
      date: parsedDate,
    });

    if (existingSchedule) {
      // 4a. Date already exists — just push the new time slot in
      const slotAlreadyExists = existingSchedule.time.some(
        (slot) => slot.startTime === startTime && slot.endTime === endTime,
      );

      if (slotAlreadyExists) {
        return res.status(409).json({
          success: false,
          message: "This time slot already exists for the given date",
        });
      }

      const updated = await ExceptionalDays.findOneAndUpdate(
        { date: parsedDate },
        {
          $push: {
            time: {
              startTime,
              endTime,
              maxAppointments: maxAppointments ?? 20,
            },
          },
          $set: { isEnable: true },
        },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        data: updated,
        message: `Slot added to existing exceptional day (${monthName})`,
      });
    }

    // 4b. No existing record — create a fresh exceptional day
    const newExceptionalDay = await ExceptionalDays.create({
      date: parsedDate,
      month: monthName,         // extracted from MonthMap
      isEnable: true,
      time: [
        {
          startTime,
          endTime,
          maxAppointments: maxAppointments ?? 20,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      data: newExceptionalDay,
      message: `Exceptional schedule created for ${monthName}`,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to add exceptional schedule",
    });
  }
};


export const getDoctorMonthlySchedule = async (req, res) => {
  const { userId } = req.params;
  const month = req.query.month;


  // if(!MonthMap.existingSchedule){
  //   return badRequestResponse(res, "Invalid month", "Month is not valid (1-12 required).");
  // }


  try {
    const schedule = await WeeklyDays.findOne({ doctorUserId:userId });
    return successResponse(res, schedule, "Schedule fetched successfully", "Schedule fetched successfully");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Failed to fetch schedule");
  }
};
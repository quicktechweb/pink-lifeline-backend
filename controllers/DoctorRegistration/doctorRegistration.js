import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { nanoid } from "nanoid";
import axios from "axios";
import { generateToken } from "../../utils/token.js";
import { badRequestResponse, formatQuantityNumber, isOverlapping, isValid24h, normalizeDate, notFoundResponse, paginatedSuccessResponse, somethingWentWrong, successResponse, toMinutes } from "../../utils/utils.js";
import { DayMap, MonthMap } from "../../constant/constant.js";
import { ExceptionalDays, WeeklyDays } from "../../models/Schedule/doctorSchedule.js";
import { uploadToImageBB } from "../../config/uploadToImageBB.js";
import { Appointment } from "../../models/Schedule/userBooking.js";
import { Comment } from "../../models/Community/CommentModel.js";
import { createOrUpdateFCMToken } from "../../services/notificationService.js";

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
      location,
      specialties,
      fcmToken,
    } = req.body;

    if (type === undefined || (Number(type) !== 0 && Number(type) !== 1)) {
      return badRequestResponse(res, "User type is required.", "User type is not found.");
    }

    if (typeof qualifications === "string") {
      qualifications = JSON.parse(qualifications);
    }

    if (typeof specialties === "string") {
      specialties = JSON.parse(specialties);
      console.log("🚀 ~ doctorRegistration.js:66 ~ registerUser ~ specialties:", specialties);
    }

    let conditions = [];

    // if (phoneNumber) {
    //   conditions.push({ phoneNumber });
    // }

    if (email) {
      conditions.push({ email });
    }

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
      location: location ? location : null,
      specialties: specialties ? specialties : null,
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
      location: newUser.location || null,
      specialties: newUser.specialties || null,
      ...(Number(type) === 1 ? { isDoctor: 1 } : { isUser: 0 }),
    };

    const fcmTokenSaving = await createOrUpdateFCMToken({ fcmToken, userId: newUser.userId, email:newUser.email });
    console.log("🚀 ~ doctorRegistration.js:153 ~ registerUser ~ fcmTokenSaving:", fcmTokenSaving)

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
  let { phoneNumber, isVerified, type, aboutMe, doctorRegistrationNumber, currentWorkplace, currentDesignation, qualifications, doctorIdCard, location, specialties } = req.body;

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

    if (location !== undefined) {
      updateData.location = location;
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

    if (specialties !== undefined) {
      updateData.specialties = JSON.parse(specialties);
    }

    /* =========================
       IMAGE UPLOAD
    ========================= */

    if (req.files?.doctorIdCard?.[0]) {
      const uploadedDoctorCard = await uploadToImageBB(req.files.doctorIdCard[0]);

      updateData.doctorIdCard = {
        url: uploadedDoctorCard,
        deleteUrl: null,
      };
    }

    if (req.files?.profilePhoto?.[0]) {
      const uploadedProfilePhoto = await uploadToImageBB(req.files.profilePhoto[0]);

      updateData.profilePhoto = uploadedProfilePhoto;
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


export const getAllDoctorByAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.body;

    const skip = (page - 1) * limit;

    const filter = {
      isDoctor: 1,
      $or: [{ isRemoved: false }, { isRemoved: { $exists: false } }],
    };

    const allowedSortFields = [
      "fullName",
      "email",
      "createdAt",
      "updatedAt",
      "score",
      "isVerified",
      "doctorRegistrationNumber",
      "currentWorkplace",
      "currentDesignation",
    ];

    const sort = {};

    if (allowedSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const [doctors, total] = await Promise.all([
      User.find(filter)
        .select(
          "fullName score profilePhoto currentDesignation doctorRegistrationNumber email isVerified currentWorkplace userId createdAt updatedAt isRemoved type location"
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    if (!doctors.length) {
      return notFoundResponse(
        res,
        "No doctors found.",
        "Get all doctors failed: empty result."
      );
    }

    return paginatedSuccessResponse(
      res,
      doctors,
      page,
      limit,
      total,
      "Doctors retrieved successfully",
      "Get all doctors successfully."
    );
  } catch (error) {
    console.error(error);

    return somethingWentWrong(
      res,
      error,
      "Failed to get doctors.",
      "Get all doctors error"
    );
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
    return res.status(400).json({ success: false, message: "Invalid day." });
  }

  // 2. Validate time presence
  if (!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "Start time and end time are required.",
    });
  }

  // 3. Validate 24h format
  if (!isValid24h(startTime) || !isValid24h(endTime)) {
    return res.status(400).json({
      success: false,
      message: "Times must be in 24-hour format HH:MM (e.g. 09:00, 17:30).",
    });
  }

  // 4. Validate range
  if (toMinutes(startTime) >= toMinutes(endTime)) {
    return res.status(400).json({
      success: false,
      message: "Start time must be before end time.",
    });
  }

  const schedule = { startTime, endTime, maxAppointments };

  try {
    // 5. Overlap check
    const existing = await WeeklyDays.findOne({ doctorUserId: userId });

    if (existing?.[dayKey]?.time?.length > 0) {
      if (isOverlapping(startTime, endTime, existing[dayKey].time)) {
        return res.status(400).json({
          success: false,
          message: "Time slot overlaps with an existing schedule.",
        });
      }
    }

    // 6. Upsert
    const updated = await WeeklyDays.findOneAndUpdate(
      { doctorUserId: userId },
      {
        $setOnInsert: { doctorUserId: userId },
        $set: { [`${dayKey}.isEnable`]: true },
        $push: { [`${dayKey}.time`]: schedule },
      },
      { new: true, upsert: true, runValidators: true },
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
  const { doctorUserId, day, startTime, endTime, maxAppointments = 20 } = req.body;

  const dayNumber = Number(day);
  const dayKey = DayMap[dayNumber];

  // 1. Validate day
  if (!dayKey) {
    return res.status(400).json({
      success: false,
      message: "Invalid day",
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
    let updated = await WeeklyDays.findOneAndUpdate(
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
    console.log("🚀 ~ doctorRegistration.js:700 ~ removeSchedule ~ ifSlotExist:", remainingSlots);
    return res.send({ ifSlotExist });

    if (!ifSlotExist) {
      return res.status(404).json({
        success: false,
        message: "Schedule slot not found",
      });
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

export const enableDisableWeekDay = async (req, res) => {
  const { day } = req.body;
  const { userId } = req.params;
  const doctorUserId = userId;

  const dayNumber = Number(day);
  const dayKey = DayMap[dayNumber];

  // 1. Validate day
  if (!dayKey) {
    return res.status(400).json({
      success: false,
      message: "Invalid day",
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

    // 3. Disable day
    const updated = await WeeklyDays.findOneAndUpdate(
      {
        doctorUserId,
      },
      [
        {
          $set: {
            [`${dayKey}.isEnable`]: { $not: [`$${dayKey}.isEnable`] },
          },
        },
      ],
      {
        new: true,
      },
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Weekday disabled successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to disable weekday",
    });
  }
};

export const getDailySchedule = async (req, res) => {
  const { userId } = req.params;
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

export const addExceptionalSchedule = async (req, res) => {
  const { userId } = req.params;
  const { date, time, maxAppointments = 20 } = req.body;

  // 1. Validate required fields
  if (!date || !time || !Array.isArray(time) || time.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Date and Time array are required.",
    });
  }

  // 2. Validate each slot in the incoming array
  for (const slot of time) {
    const { startTime, endTime } = slot;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Each slot must have start time and end time.",
      });
    }

    if (!isValid24h(startTime) || !isValid24h(endTime)) {
      return res.status(400).json({
        success: false,
        message: `Invalid 24h format in slot: ${startTime} - ${endTime}`,
      });
    }

    if (toMinutes(startTime) >= toMinutes(endTime)) {
      return res.status(400).json({
        success: false,
        message: `Start time must be before end time in slot: ${startTime} - ${endTime}`,
      });
    }
  }

  // 3. Check overlap within the incoming array itself
  for (let i = 0; i < time.length; i++) {
    for (let j = i + 1; j < time.length; j++) {
      const a = time[i];
      const b = time[j];
      if (toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime)) {
        return res.status(400).json({
          success: false,
          message: `Slots overlap each other: ${a.startTime}-${a.endTime} and ${b.startTime}-${b.endTime}`,
        });
      }
    }
  }

  // 4. Validate and normalize date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid date format.",
    });
  }

  const dateKey = parsedDate.toISOString().split("T")[0];
  const monthName = MonthMap[parsedDate.getMonth() + 1];

  // normalize incoming slots
  const newSlots = time.map((slot) => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxAppointments: slot.maxAppointments ?? maxAppointments,
  }));

  try {
    // 5. Find existing record for this doctor + date
    const existing = await ExceptionalDays.findOne({
      doctorUserId: userId,
      date: dateKey,
    });

    if (existing) {
      // 6a. Check each new slot against already stored slots
      for (const slot of newSlots) {
        if (isOverlapping(slot.startTime, slot.endTime, existing.time)) {
          return res.status(409).json({
            success: false,
            message: `Slot ${slot.startTime}-${slot.endTime} overlaps with an existing slot.`,
          });
        }
      }

      // 6b. Push all new slots
      const updated = await ExceptionalDays.findOneAndUpdate(
        { doctorUserId: userId, date: dateKey },
        {
          $push: { time: { $each: newSlots } },
          $set: { isEnable: true },
        },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        data: updated,
        message: `Slots added to existing exceptional day (${monthName})`,
      });
    }

    // 6c. No record yet — create fresh
    const created = await ExceptionalDays.create({
      doctorUserId: userId,
      date: dateKey,
      isEnable: true,
      time: newSlots,
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: `Exceptional schedule created for ${monthName}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to add exceptional schedule.",
    });
  }
};

export const removeExceptionalDay = async (req, res) => {
  const { userId } = req.params;
  const { date } = req.body;
  const formattedDate = new Date(date).toISOString().split("T")[0];

  try {
    const deleted = await ExceptionalDays.findOneAndDelete({ doctorUserId: userId, date: formattedDate });
    return res.status(200).json({
      success: true,
      data: deleted,
      message: "Exceptional day removed",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove exceptional day",
    });
  }
};

export const setDoctorScore = async (req, res) => {
  const { userId } = req.params;
  const { score, isVerified } = req.body;
  if (!isVerified) {
    return badRequestResponse(res, "Doctor is not verified", "Doctor is not verified");
  }
  try {
    const updated = await User.findOneAndUpdate({ userId, type: 1 }, { score }, { new: true });
    return successResponse(res, updated, "Score updated successfully", "Score updated successfully");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Failed to update score");
  }
};

export const getDoctorMonthlySchedule = async (req, res) => {
  const { userId } = req.params;
  const month = Number(req.body.month);

  try {
    if (!MonthMap[month]) {
      return badRequestResponse(res, "Invalid month", "Month must be between 1 and 12");
    }

    const weekDay = await WeeklyDays.findOne({
      doctorUserId: userId,
    });

    const exceptionalDay = await ExceptionalDays.find({
      doctorUserId: userId,
    });

    const filteredExceptionalDays = exceptionalDay.filter((item) => {
      return new Date(item.date).getMonth() + 1 === month;
    });

    return successResponse(
      res,
      {
        weekDay,
        exceptionalDay: filteredExceptionalDays,
      },
      "Schedule fetched successfully",
      "Schedule fetched successfully",
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Failed to fetch schedule");
  }
};

export const getDailyAppointments = async (req, res) => {
  const { userId } = req.params;
  const { date } = req.body;

  const formattedDate = normalizeDate(date);
  console.log("🚀 ~ doctorRegistration.js:990 ~ getDailyAppointments ~ formattedDate:", formattedDate);

  if (!formattedDate) {
    return res.status(400).json({
      success: false,
      message: "Invalid date format.",
    });
  }

  try {
    const appointments = await Appointment.find({
      doctorUserId: userId,
      appointmentDate: formattedDate, // assuming your schema uses appointmentDate
    });

    return successResponse(res, appointments, "Appointments retrieved successfully.", "Get appointments successful.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const getTotalCommentsPatients = async (req, res) => {
  const { userId } = req.params;
  try {
    let totalComments = await Comment.countDocuments({ userId: userId });
    totalComments = formatQuantityNumber(totalComments);
    let totalAppointments = await Appointment.countDocuments({ doctorUserId: userId, status: "completed" });
    totalAppointments = formatQuantityNumber(totalAppointments);

    return successResponse(res, { totalComments, totalAppointments }, "Total comments fetched successfully.", "Total comments fetched successfully.");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Something went wrong.");
  }
};

export const addDoctorWeeklySchedule = async (req, res) => {
  try {
    const { mon, tue, wed, thu, fri, sat, sun } = req.body;
    const { userId: doctorUserId } = req.params;

    if (!doctorUserId) {
      return res.status(400).json({
        success: false,
        message: "doctorUserId is required in request body.",
      });
    }

    const dayNames = {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday",
    };

    const DAYS = { mon, tue, wed, thu, fri, sat, sun };

    // ── Helper: convert "HH:MM" to total minutes ──
    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    // ── Validate all day slots ──
    for (const [dayKey, dayVal] of Object.entries(DAYS)) {
      if (!dayVal) continue; // day not provided — skip

      const { time = [] } = dayVal;

      for (let i = 0; i < time.length; i++) {
        const slot = time[i];
        const { startTime, endTime, maxAppointments } = slot;

        // Required fields
        if (!startTime || !endTime) {
          return res.status(400).json({
            success: false,
            message: `On ${dayNames[dayKey]}, the end time must be later than the start time.`,
          });
        }

        // 24h format check: HH:MM
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(startTime)) {
          return res.status(400).json({
            success: false,
            message: `${dayKey} slot[${i}]: startTime "${startTime}" is not valid 24h format (HH:MM).`,
          });
        }
        if (!timeRegex.test(endTime)) {
          return res.status(400).json({
            success: false,
            message: `${dayKey} slot[${i}]: endTime "${endTime}" is not valid 24h format (HH:MM).`,
          });
        }

        // endTime must be AFTER startTime
        if (toMinutes(endTime) <= toMinutes(startTime)) {
          return res.status(400).json({
            success: false,
            message: `Invalid schedule for ${dayNames[dayKey]}. The end time (${endTime}) must be later than the start time (${startTime}).`,
          });
        }

        // maxAppointments must be a positive number
        if (maxAppointments === undefined || maxAppointments === null || typeof maxAppointments !== "number" || maxAppointments < 1) {
          return res.status(400).json({
            success: false,
            message: `${dayKey} slot[${i}]: maxAppointments must be a positive number.`,
          });
        }
      }
    }

    // ── Check if doc already exists ──
    const existingDoc = await WeeklyDays.findOne({ doctorUserId });

    // ── Build the update payload (only override days that were sent) ──
    const updatePayload = {};
    for (const [dayKey, dayVal] of Object.entries(DAYS)) {
      if (dayVal !== undefined) {
        updatePayload[dayKey] = dayVal;
      }
    }

    let savedDoc;

    if (existingDoc) {
      // Update existing doc
      Object.assign(existingDoc, updatePayload);
      savedDoc = await existingDoc.save();
    } else {
      // Create new doc
      savedDoc = await WeeklyDays.create({
        doctorUserId,
        ...updatePayload,
      });
    }

    return res.status(200).json({
      success: true,
      message: existingDoc ? "Weekly schedule updated successfully." : "Weekly schedule created successfully.",
      data: savedDoc,
    });
  } catch (error) {
    console.error("addDoctorWeeklySchedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};




  export const getAllAppointmentsByAdmin = async (req, res) => {
    const { limit = 10, page = 1 } = req.body;

    try {
      const parsedLimit = Number(limit);
      const parsedPage = Number(page);

      const [doctors, totalDoctors] = await Promise.all([
        User.aggregate([
          {
            $match: {
              type: 1,
              isVerified: true,
            },
          },

{
  $lookup: {
    from: "appointments",
    let: { doctorUserId: "$userId" },
    pipeline: [
      {
        $match: {
          $expr: {
            $eq: ["$doctorUserId", "$$doctorUserId"],
          },
        },
      },

      {
        $lookup: {
          from: "doctors", // your User model collection name
          localField: "userId",
          foreignField: "userId",
          as: "patient",
        },
      },

      {
        $unwind: {
          path: "$patient",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          patientName: "$patient.fullName",
          patientEmail: "$patient.email",
          patientPhone: "$patient.phoneNumber",
          patientProfilePhoto: "$patient.profilePhoto",
        },
      },

      {
        $project: {
          patient: 0,
        },
      },
    ],
    as: "appointments",
  },
},

          {
            $addFields: {
              appointmentsCount: {
                $size: "$appointments",
              },
            },
          },
          // Only doctors having appointments
          {
            $match: {
              appointmentsCount: { $gt: 0 },
            },
          },
          // Most appointments first
          {
            $sort: {
              appointmentsCount: -1,
            },
          },
          {
            $project: {
              userId: 1,
              fullName: 1,
              profilePhoto: 1,
              doctorRegistrationNumber: 1,
              currentWorkplace: 1,
              appointmentsCount: 1,
              specialties: 1,
              location:1,
              score:1,
              phoneNumber:1,
              email:1,
              isVerified:1,
              doctorIdCard:1,
              appointments: 1,
            },
          },

          {
            $skip: (parsedPage - 1) * parsedLimit,
          },

          {
            $limit: parsedLimit,
          },
        ]),

        User.aggregate([
          {
            $match: {
              type: 1,
              isVerified: true,
            },
          },

          {
            $lookup: {
              from: "appointments",
              localField: "userId",
              foreignField: "doctorUserId",
              as: "appointments",
            },
          },

          {
            $addFields: {
              appointmentsCount: {
                $size: "$appointments",
              },
            },
          },

          {
            $match: {
              appointmentsCount: { $gt: 0 },
            },
          },

          {
            $count: "total",
          },
        ]),
      ]);

      const total = totalDoctors[0]?.total || 0;

      if (!doctors.length) {
        return notFoundResponse(
          res,
          "No doctors with appointments found.",
          "Get appointments failed: empty result."
        );
      }






      return successResponse(
        res,
        {
          doctors,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit),
          },
        },
        "Appointments retrieved successfully.",
        "Get appointments successful."
      );
    } catch (error) {
      console.error(error);
      return somethingWentWrong(res, error, "Something went wrong.");
    }
  };







export const confirmAppointmentByAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        status: "pending",
      },
      {
        $set: {
          status: "confirmed",
        },
      },
      {
        new: true,
      }
    );

    if (!appointment) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending appointments can be confirmed.",
      });
    }

    return successResponse(
      res,
      appointment,
      "Appointment confirmed successfully.",
      "Appointment confirmed successfully."
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



export const cancelAppointmentByAdmin = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false
      },
      {
        $set: {
          status: "cancelled",
          cancelledBy: "admin",
          note: note,
        },
      },
      {
        new: true,
      }
    );

    if (!appointment) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending appointments can be cancelled.",
      });
    }

    return successResponse(
      res,
      appointment,
      "Appointment cancelled successfully.",
      "Appointment cancelled successfully."
    );
  } catch (error) {
    console.error(error);
    return somethingWentWrong(
      res,
      error,
      "Something went wrong."
    )
  }
};
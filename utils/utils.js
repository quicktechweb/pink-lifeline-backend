import { Bleeding } from "../models/Dropdowns/bleedingDropdownModel.js";
import { Spotting } from "../models/Dropdowns/spottingDropdownModel.js";
import { Symptom } from "../models/Dropdowns/symptomsDropdownModel.js";
import Notification from "../models/Notification/NotificationModel.js";

// Helper to generate a standardized, readable timestamp string
const getTimestamp = () => `[${new Date().toLocaleString()}]`;

export const notFoundResponse = (res, message, logMessage) => {
  if (logMessage) {
    console.error(getTimestamp(), "ERROR::", logMessage);
  }

  return res.status(404).json({
    success: false,
    message,
  });
};

export const badRequestResponse = (res, message, logMessage) => {
  if (logMessage) {
    console.error(getTimestamp(), "BAD REQUEST:", logMessage);
  }

  return res.status(400).json({
    success: false,
    message,
  });
};

export const somethingWentWrong = (res, data, message, logMessage) => {
  console.error(getTimestamp(), "SERVER CRASH DATA:", data, "| LOG:", logMessage);
  return res.status(503).json({
    success: false,
    message: message,
  });
};

export const successResponse = (res, data, message, logMessage, total) => {
  if (logMessage) {
    console.log(getTimestamp(), "SUCCESS:", logMessage);
  }

  const isArray = Array.isArray(data);

  return res.status(200).json({
    success: true,
    length: isArray ? data.length : undefined,
    data,
    total: total,
    message,
  });
};

export const paginatedSuccessResponse = (res, data, page, limit, total, message, logMessage, hasMore) => {
  if (logMessage) {
    console.log(getTimestamp(), "SUCCESS:", logMessage);
  }

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      hasMore: hasMore ? true : false,
    },
    message,
  });
};

export const alreadyExistResponse = (res, data, message, logMessage) => {
  if (logMessage) {
    console.error(getTimestamp(), "CONFLICT:", logMessage);
  }

  return res.status(409).json({
    success: false,
    data,
    message,
  });
};

export const checkValidGapBetweenPeriods = (previousDate, currentDate) => {
  const gapInDays = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
  const expectedGap = Number(process.env.POST_MENSTRUAL_INTERVAL) || 10;

  const isValidGap = gapInDays === expectedGap;

  return isValidGap;
};

export const isWithinSamePeriod = (lastEntryDate, currentDate) => {
  const gapInDays = Math.floor((currentDate - lastEntryDate) / (1000 * 60 * 60 * 24));
  const maxGap = Number(process.env.MAX_INTRA_PERIOD_GAP) || 7;
  return gapInDays >= 0 && gapInDays <= maxGap;
};

export const isValidNewPeriodGap = (referenceDate, currentDate) => {
  const gapInDays = Math.floor((currentDate - referenceDate) / (1000 * 60 * 60 * 24));
  const minGap = Number(process.env.POST_MENSTRUAL_INTERVAL) || 10;
  return gapInDays >= minGap;
};

export const getBleedingTitle = async (id) => {
  const bleeding = await Bleeding.findById(id);
  return bleeding ? bleeding.title : null;
};

export const getSymptomTitle = async (id) => {
  const symptom = await Symptom.findById(id);
  return symptom ? symptom.title : null;
};

export const getSpottingTitle = async (id) => {
  const spotting = await Spotting.findById(id);
  return spotting ? spotting.title : null;
};

export const formatQuantityNumber = (num) => {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }

  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }

  return num.toString();
};

export const isOverlapping = (newStart, newEnd, existingSlots) => {
  const newS = toMinutes(newStart);
  const newE = toMinutes(newEnd);

  return existingSlots.some((slot) => {
    const s = toMinutes(slot.startTime);
    const e = toMinutes(slot.endTime);
    return newS < e && newE > s;
  });
};

export const toMinutes = (timeStr) => {
  const str = timeStr.trim().toLowerCase();
  const isPM = str.endsWith("pm");
  const isAM = str.endsWith("am");

  const clean = str.replace("am", "").replace("pm", "").trim();
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isAM && h === 12) h = 0; // 12:00am → 0
  if (isPM && h !== 12) h += 12; // 1:00pm → 13

  return h * 60 + m;
};

// Validates strict 24h format "HH:MM"
export const isValid24h = (timeStr) => /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr);

export function convertTo24Hour(timeStr) {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    throw new Error("Invalid time format");
  }

  let [, hours, minutes, period] = match;

  hours = parseInt(hours, 10);

  if (period.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  }

  if (period.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export function normalizeDate(date) {
  if (!date) return null;

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().split("T")[0];
}

export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      type: user.type,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

export const saveNotificationToDB = async (notification) => {
  const newNotification = new Notification(notification);
  const response = await newNotification.save();
  console.log("🚀 ~ utils.js:222 ~ saveNotificationToDB ~ respone:", response);
  return response;
};

export const BD_CURRENT_TIME = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(new Date());

export const BD_CURRENT_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

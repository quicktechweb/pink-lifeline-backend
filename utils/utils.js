import { Bleeding } from "../models/Dropdowns/bleedingDropdownModel.js";
import { Spotting } from "../models/Dropdowns/spottingDropdownModel.js";
import { Symptom } from "../models/Dropdowns/symptomsDropdownModel.js";

// Helper to generate a standardized, readable timestamp string
const getTimestamp = () => `[${new Date().toLocaleString()}]`;

export const notFoundResponse = (res, message, logMessage) => {
  if (logMessage) {
    console.error(getTimestamp(), "ERROR:", logMessage);
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

export const successResponse = (res, data, message, logMessage) => {
  if (logMessage) {
    console.log(getTimestamp(), "SUCCESS:", logMessage);
  }

  const isArray = Array.isArray(data);

  return res.status(200).json({
    success: true,
    length: isArray ? data.length : undefined,
    data,
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
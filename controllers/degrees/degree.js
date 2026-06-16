// controllers/Degree/degreeController.js

import Degree from "../../models/degree/degree.js";
import { badRequestResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";

/* =========================
   ADD DEGREE
========================= */

export const addDegree = async (req, res) => {
  try {
    const { degreeName } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!degreeName) {
      return badRequestResponse(res, "Degree name is required", "Degree name is required");
    }

    /* =========================
       MULTIPLE DEGREE SUPPORT
    ========================= */

    if (Array.isArray(degreeName)) {
      const cleanedDegrees = degreeName.map((item) => item.trim());

      /* =========================
         CHECK EXISTING DEGREES
      ========================= */

      const existingDegrees = await Degree.find({
        degreeName: { $in: cleanedDegrees },
        isDeleted: false,
      });

      const existingDegreeNames = existingDegrees.map((item) => item.degreeName);

      /* =========================
         REMOVE DUPLICATES
      ========================= */

      const filteredDegrees = cleanedDegrees.filter((item) => !existingDegreeNames.includes(item));

      if (filteredDegrees.length === 0) {
        return badRequestResponse(res, "All degrees already exist", "All degrees already exist");
      }

      const formattedDegrees = filteredDegrees.map((item) => ({
        degreeName: item,
      }));

      const insertedDegrees = await Degree.insertMany(formattedDegrees);

      return successResponse(res, insertedDegrees, "Degrees added successfully", "Degrees added successfully");
    }

    /* =========================
       SINGLE DEGREE
    ========================= */

    const existingDegree = await Degree.findOne({
      degreeName: degreeName.trim(),
      isDeleted: false,
    });

    if (existingDegree) {
      return badRequestResponse(res, "Degree already exists", "Degree already exists");
    }

    const degree = await Degree.create({
      degreeName: degreeName.trim(),
    });

    return successResponse(res, degree, "Degree added successfully", "Degree added successfully");
  } catch (error) {
    console.log(error);

    return somethingWentWrong(res, error.message, "Failed to add degree", error.message);
  }
};

/* =========================
   GET ALL DEGREES
========================= */

export const getAllDegrees = async (req, res) => {
  try {
    const degrees = await Degree.find({
      isDeleted: false,
    }).sort({ createdAt: -1 });

    if (!degrees || degrees.length === 0) {
      return badRequestResponse(res, "No degrees found", "No degrees found");
    }

    return successResponse(res, degrees, "Degrees fetched successfully", "Degrees fetched successfully");
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to fetch degrees", error.message);
  }
};

/* =========================
   UPDATE DEGREE
========================= */

export const updateDegree = async (req, res) => {
  try {
    const { degreeId } = req.params;
    const { degreeName } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!degreeName) {
      return badRequestResponse(res, "Degree name is required", "Degree name is required");
    }

    /* =========================
       FIND DEGREE
    ========================= */

    const degree = await Degree.findOne({
      _id: degreeId,
      isDeleted: false,
    });

    if (!degree) {
      return badRequestResponse(res, "Degree not found", "Degree not found");
    }

    /* =========================
       CHECK DUPLICATE
    ========================= */

    const existingDegree = await Degree.findOne({
      degreeName: degreeName.trim(),
      isDeleted: false,
      _id: { $ne: degreeId },
    });

    if (existingDegree) {
      return badRequestResponse(res, "Degree already exists", "Degree already exists");
    }

    /* =========================
       UPDATE
    ========================= */

    degree.degreeName = degreeName.trim();

    await degree.save();

    return successResponse(res, degree, "Degree updated successfully", "Degree updated successfully");
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to update degree", error.message);
  }
};

/* =========================
   DELETE DEGREE
========================= */

export const deleteDegree = async (req, res) => {
  try {
    const { degreeId } = req.params;

    /* =========================
       FIND DEGREE
    ========================= */

    const degree = await Degree.findOne({
      _id: degreeId,
      isDeleted: false,
    });

    if (!degree) {
      return badRequestResponse(res, "Degree not found", "Degree not found");
    }

    /* =========================
       SOFT DELETE
    ========================= */

    degree.isDeleted = true;

    await degree.save();

    return successResponse(res, degree, "Degree deleted successfully", "Degree deleted successfully");
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to delete degree", error.message);
  }
};

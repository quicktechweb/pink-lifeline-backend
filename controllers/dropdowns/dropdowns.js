import { Bleeding } from '../../models/Dropdowns/bleedingDropdownModel.js';
import { Spotting } from '../../models/Dropdowns/spottingDropdownModel.js';
import { Symptom } from '../../models/Dropdowns/symptomsDropdownModel.js';
import {
  successResponse,
  somethingWentWrong,
  badRequestResponse,
} from '../../utils/utils.js';

/* =========================
   ADD SPOTTING
========================= */

export const addSpotting = async (req, res) => {
  try {
    const { title } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!title) {
      return badRequestResponse(res, 'Title is required', 'Title is required');
    }

    /* =========================
       CHECK DUPLICATE
    ========================= */

    const existingSpotting = await Spotting.findOne({
      title: title.trim(),
    });

    if (existingSpotting) {
      return badRequestResponse(
        res,
        'Spotting already exists',
        'Spotting already exists'
      );
    }

    /* =========================
       CREATE
    ========================= */

    const spotting = await Spotting.create({
      title: title.trim(),
    });

    return successResponse(
      res,
      spotting,
      'Spotting added successfully',
      'Spotting added successfully'
    );
  } catch (error) {
    console.error('addSpotting error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to add spotting',
      error.message
    );
  }
};

/* =========================
   GET ALL SPOTTING
========================= */

export const getAllSpotting = async (req, res) => {
  try {
    const spotting = await Spotting.find().sort({
      createdAt: -1,
    });

    if (!spotting.length) {
      return badRequestResponse(res, 'No spotting found', 'No spotting found');
    }

    return successResponse(
      res,
      spotting,
      'Spotting fetched successfully',
      'Spotting fetched successfully'
    );
  } catch (error) {
    console.error('getAllSpotting error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to fetch spotting',
      error.message
    );
  }
};

/* =========================
   UPDATE SPOTTING
========================= */

export const updateSpotting = async (req, res) => {
  try {
    const { spottingId } = req.params;
    const { title, id } = req.body;

    /* =========================
       FIND
    ========================= */

    const spotting = await Spotting.findById(spottingId);

    if (!spotting) {
      return badRequestResponse(
        res,
        'Spotting not found',
        'Spotting not found'
      );
    }

    /* =========================
       UPDATE
    ========================= */

    if (title) {
      spotting.title = title.trim();
    }

    if (id !== undefined) {
      spotting.id = id;
    }

    await spotting.save();

    return successResponse(
      res,
      spotting,
      'Spotting updated successfully',
      'Spotting updated successfully'
    );
  } catch (error) {
    console.error('updateSpotting error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to update spotting',
      error.message
    );
  }
};

/* =========================
   DELETE SPOTTING
========================= */

export const deleteSpotting = async (req, res) => {
  try {
    const { spottingId } = req.params;

    /* =========================
       FIND
    ========================= */

    const spotting = await Spotting.findById(spottingId);

    if (!spotting) {
      return badRequestResponse(
        res,
        'Spotting not found',
        'Spotting not found'
      );
    }

    /* =========================
       DELETE
    ========================= */

    const result = await Spotting.findByIdAndDelete(spottingId);

    return successResponse(
      res,
      result,
      'Spotting deleted successfully',
      'Spotting deleted successfully'
    );
  } catch (error) {
    console.error('deleteSpotting error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to delete spotting',
      error.message
    );
  }
};

/* =========================
   ADD BLEEDING
========================= */

export const addBleeding = async (req, res) => {
  try {
    const { title, flowLevel } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!title) {
      return badRequestResponse(res, 'Title is required', 'Title is required');
    }

    /* =========================
       CHECK DUPLICATE
    ========================= */

    const existingBleeding = await Bleeding.findOne({
      title,
    });

    if (existingBleeding) {
      return badRequestResponse(
        res,
        'Bleeding already exists',
        'Bleeding already exists'
      );
    }

    /* =========================
       CREATE
    ========================= */

    const bleeding = await Bleeding.create({
      title: title.trim(),
      flowLevel,
    });

    return successResponse(
      res,
      bleeding,
      'Bleeding added successfully',
      'Bleeding added successfully'
    );
  } catch (error) {
    console.error('addBleeding error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to add bleeding',
      error.message
    );
  }
};

/* =========================
   GET ALL BLEEDING
========================= */

export const getAllBleeding = async (req, res) => {
  try {
    const bleeding = await Bleeding.find().sort({
      createdAt: -1,
    });

    if (!bleeding.length) {
      return badRequestResponse(res, 'No bleeding found', 'No bleeding found');
    }

    return successResponse(
      res,
      bleeding,
      'Bleeding fetched successfully',
      'Bleeding fetched successfully'
    );
  } catch (error) {
    console.error('getAllBleeding error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to fetch bleeding',
      error.message
    );
  }
};

/* =========================
   UPDATE BLEEDING
========================= */

export const updateBleeding = async (req, res) => {
  try {
    const { bleedingId } = req.params;

    const { id, title, flowLevel } = req.body;

    /* =========================
       FIND
    ========================= */

    const bleeding = await Bleeding.findById(bleedingId);

    if (!bleeding) {
      return badRequestResponse(
        res,
        'Bleeding not found',
        'Bleeding not found'
      );
    }

    /* =========================
       UPDATE
    ========================= */

    if (id !== undefined) {
      bleeding.id = id;
    }

    if (title) {
      bleeding.title = title.trim();
    }

    if (flowLevel !== undefined) {
      bleeding.flowLevel = flowLevel;
    }

    await bleeding.save();

    return successResponse(
      res,
      bleeding,
      'Bleeding updated successfully',
      'Bleeding updated successfully'
    );
  } catch (error) {
    console.error('updateBleeding error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to update bleeding',
      error.message
    );
  }
};

/* =========================
   DELETE BLEEDING
========================= */

export const deleteBleeding = async (req, res) => {
  try {
    const { bleedingId } = req.params;

    /* =========================
       FIND
    ========================= */

    const bleeding = await Bleeding.findById(bleedingId);

    if (!bleeding) {
      return badRequestResponse(
        res,
        'Bleeding not found',
        'Bleeding not found'
      );
    }

    /* =========================
       DELETE
    ========================= */

    const result = await Bleeding.findByIdAndDelete(bleedingId);

    return successResponse(
      res,
      result,
      'Bleeding deleted successfully',
      'Bleeding deleted successfully'
    );
  } catch (error) {
    console.error('deleteBleeding error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to delete bleeding',
      error.message
    );
  }
};

/* =========================
   ADD SYMPTOM
========================= */

export const addSymptom = async (req, res) => {
  try {
    const { title, isRecent } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!title) {
      return badRequestResponse(res, 'Title is required', 'Title is required');
    }

    /* =========================
       CHECK DUPLICATE
    ========================= */

    const existingSymptom = await Symptom.findOne({
      title: title.trim(),
    });

    if (existingSymptom) {
      return badRequestResponse(
        res,
        'Symptom already exists',
        'Symptom already exists'
      );
    }

    /* =========================
       CREATE
    ========================= */

    const symptom = await Symptom.create({
      title: title.trim(),
      isRecent,
    });

    return successResponse(
      res,
      symptom,
      'Symptom added successfully',
      'Symptom added successfully'
    );
  } catch (error) {
    console.error('addSymptom error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to add symptom',
      error.message
    );
  }
};

/* =========================
   GET ALL SYMPTOMS
========================= */

export const getAllSymptoms = async (req, res) => {
  try {
    const symptoms = await Symptom.find().sort({
      createdAt: -1,
    });

    if (!symptoms.length) {
      return badRequestResponse(res, 'No symptoms found', 'No symptoms found');
    }

    return successResponse(
      res,
      symptoms,
      'Symptoms fetched successfully',
      'Symptoms fetched successfully'
    );
  } catch (error) {
    console.error('getAllSymptoms error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to fetch symptoms',
      error.message
    );
  }
};

/* =========================
   UPDATE SYMPTOM
========================= */

export const updateSymptom = async (req, res) => {
  try {
    const { symptomId } = req.params;

    const { title, id, isRecent } = req.body;

    /* =========================
       FIND
    ========================= */

    const symptom = await Symptom.findById(symptomId);

    if (!symptom) {
      return badRequestResponse(res, 'Symptom not found', 'Symptom not found');
    }

    /* =========================
       UPDATE
    ========================= */

    if (title) {
      symptom.title = title.trim();
    }

    if (id !== undefined) {
      symptom.id = id;
    }

    if (isRecent !== undefined) {
      symptom.isRecent = isRecent;
    }

    await symptom.save();

    return successResponse(
      res,
      symptom,
      'Symptom updated successfully',
      'Symptom updated successfully'
    );
  } catch (error) {
    console.error('updateSymptom error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to update symptom',
      error.message
    );
  }
};

/* =========================
   DELETE SYMPTOM
========================= */

export const deleteSymptom = async (req, res) => {
  try {
    const { symptomId } = req.params;

    /* =========================
       FIND
    ========================= */

    const symptom = await Symptom.findById(symptomId);

    if (!symptom) {
      return badRequestResponse(res, 'Symptom not found', 'Symptom not found');
    }

    /* =========================
       DELETE
    ========================= */

    const result = await Symptom.findByIdAndDelete(symptomId);

    return successResponse(
      res,
      result,
      'Symptom deleted successfully',
      'Symptom deleted successfully'
    );
  } catch (error) {
    console.error('deleteSymptom error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to delete symptom',
      error.message
    );
  }
};

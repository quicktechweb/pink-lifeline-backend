import express from "express";
import { exec } from "child_process";
import path from "path";
import PeriodTracker from "./../models/Period/PeriodModel.js";
import DoctorRegistration from "../models/DoctorRegistration/DoctorRegistration.js";
import mongoose from "mongoose";
import Notification from "../models/Notification/NotificationModel.js";

const internalUtilRoutes = express.Router();

/**
 * Clear all period tracker data for a user
 */
internalUtilRoutes.delete("/clear-user-data/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await PeriodTracker.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: "All user period tracker data cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing user data:", error);

    res.status(500).json({
      success: false,
      message: "Failed to clear user data",
      error: error.message,
    });
  }
});

/**
 * Run insertPeriodData.js script
 */
internalUtilRoutes.post("/run-script", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({
        success: false,
        message: "script is required",
      });
    }

    const scriptsDir = path.join(process.cwd(), "scripts");

    exec(`node "${script}"`, { cwd: scriptsDir }, (error, stdout, stderr) => {
      if (error) {
        console.error("Script execution error:", error);

        return res.status(500).json({
          success: false,
          message: "Script execution failed",
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Script executed successfully",
        output: stdout,
        stderr,
      });
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to run script",
      error: error.message,
    });
  }
});

internalUtilRoutes.get("/all-types-of-user", async (req, res) => {
  try {
    const users = await DoctorRegistration.find({});
    res.status(200).json({
      success: true,
      message: "All users retrieved successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: error.message,
    });
  }
});

internalUtilRoutes.get("/get-all-connections", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();

    const collectionNames = collections.map((col) => col.name);

    return res.status(200).json({
      success: true,
      total: collectionNames.length,
      collections: collectionNames,
    });
  } catch (error) {
    console.error("Error fetching collections:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch collections",
      error: error.message,
    });
  }
});

internalUtilRoutes.get("/collection/:collectionName", async (req, res) => {
  try {
    const { collectionName } = req.params;

    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();

    const exists = collections.some((c) => c.name === collectionName);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Collection '${collectionName}' not found. Hit get-all-connections this api to get all collection names.`,
      });
    }

    const data = await mongoose.connection.db.collection(collectionName).find({}).sort({ createdAt: -1 }).toArray();

    return res.status(200).json({
      success: true,
      collection: collectionName,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

internalUtilRoutes.put("/update-property-by-id/:collectionName/:id", async (req, res) => {
  try {
    const { collectionName, id } = req.params;

    // Check collection exists
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();

    const exists = collections.some((c) => c.name === collectionName);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Collection '${collectionName}' not found.`,
      });
    }

    // body becomes update object directly
    const updateData = req.body;

    if (!Object.keys(updateData).length) {
      return res.status(400).json({
        success: false,
        message: "No properties provided to update.",
      });
    }

    const result = await mongoose.connection.db.collection(collectionName).findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }, // MongoDB Driver v4+
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

internalUtilRoutes.post("/delete-specific-data-form-each-collection", async (req, res) => {
  try {
    const { field, value } = req.body;

    if (!field) {
      return res.status(400).json({
        success: false,
        message: "field is required",
      });
    }

    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();

    const results = [];

    for (const { name: collectionName } of collections) {
      const collection = mongoose.connection.db.collection(collectionName);

      const deleteResult = await collection.deleteMany({
        [field]: value,
      });

      if (deleteResult.deletedCount > 0) {
        results.push({
          collection: collectionName,
          deletedCount: deleteResult.deletedCount,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Matching documents deleted successfully",
      data: results,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

internalUtilRoutes.patch("/update-schedule-time/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId }).sort({
      createdAt: 1,
    });

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No notifications found.",
      });
    }

    const now = new Date();

    for (let i = 0; i < notifications.length; i++) {
      const updatedTime = new Date(now);

      // +1 minute, +2 minutes, +3 minutes...
      updatedTime.setMinutes(updatedTime.getMinutes() + (i + 1));

      // HH:mm
      const hh = String(updatedTime.getHours()).padStart(2, "0");
      const mm = String(updatedTime.getMinutes()).padStart(2, "0");

      // YYYY-MM-DD
      const yyyy = updatedTime.getFullYear();
      const month = String(updatedTime.getMonth() + 1).padStart(2, "0");
      const day = String(updatedTime.getDate()).padStart(2, "0");

      notifications[i].notificationSendTime = `${hh}:${mm}`;
      notifications[i].notificationSendDate = `${yyyy}-${month}-${day}`;
      notifications[i].autoReminderLimit = 3;

      await notifications[i].save();
    }

    const result = await Notification.find({ userId });

    return res.status(200).json({
      success: true,
      data: result,
      message: "Notification schedule updated successfully.",
      totalUpdated: notifications.length,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default internalUtilRoutes;

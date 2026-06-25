import express from "express";
import { exec } from "child_process";
import path from "path";
import PeriodTracker from "./../models/Period/PeriodModel.js";
import DoctorRegistration from "../models/DoctorRegistration/DoctorRegistration.js";
import mongoose from "mongoose";
import Notification from "../models/Notification/NotificationModel.js";
import Role from "../models/RolePermission/RolePermission.js";

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



internalUtilRoutes.post("/create-role-route", async (req, res) => {
  try {
    const { role, routeJSON } = req.body;
    const newRole = new Role({ role, routeJSON });
    await newRole.save();
    return res.status(200).json({
      success: true,
      message: "Role created successfully",
      data: newRole,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create role",
      error: error.message,
    });
  }
});




internalUtilRoutes.post("/update-role-route", async (req, res) => {
  const { role, route } = req.body;

  try {
    const updatedRole = await Role.findOneAndUpdate({ role }, { route }, { new: true });
    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: updatedRole,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update role",
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


internalUtilRoutes.patch("/update-schedule-time", async (req, res) => {
  try {
    const {
      userId,
      fcmTokens,
      body,
      title,
      type,
      autoReminderLimit,
    } = req.body;

    const now = new Date();

    const originalMinute = now.getMinutes();

    // Add 30 seconds
    now.setSeconds(now.getSeconds() + 30);

    // If still in the same minute, move to the next minute
    if (now.getMinutes() === originalMinute) {
      now.setMinutes(now.getMinutes() + 1);
    }

    // Format date (YYYY-MM-DD)
    const notificationSendDate = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Format time (HH:mm)
    const notificationSendTime = `${String(now.getHours()).padStart(
      2,
      "0"
    )}:${String(now.getMinutes()).padStart(2, "0")}`;

    const notification = await Notification.findOneAndUpdate(
      { userId },
      {
        $set: {
          fcmTokens,
          notificationSendTime,
          notificationSendDate,
          body,
          title,
          type,
          autoReminderLimit,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    // Restart after response is sent (only if using nodemon/pm2)


    return res.status(200).json({
      success: true,
      message: "Notification saved successfully.",
      data: notification,
    });

        setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default internalUtilRoutes;

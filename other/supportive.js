import express from "express";
import { exec } from "child_process";
import path from "path";
import PeriodTracker from "./../models/Period/PeriodModel.js";
import DoctorRegistration from "../models/DoctorRegistration/DoctorRegistration.js";
import mongoose from "mongoose";
import Notification from "../models/Notification/NotificationModel.js";
import Role from "../models/RolePermission/RolePermission.js";
import RoleBackup from "../models/RolePermission/RolePermissionBackUp.js";

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

    const routeJSONString = JSON.stringify(routeJSON);

    // Create Role
    const newRole = await Role.create({
      role,
      routeJSON: routeJSONString,
    });

    // Backup
    await RoleBackup.create({
      role: newRole.role,
      routeJSON: newRole.routeJSON,
    });

    return res.status(201).json({
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



internalUtilRoutes.put("/update-role-route/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { role, routeJSON } = req.body;

    // Find existing role
    const oldRole = await Role.findById(id);

    if (!oldRole) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    const newRouteJSONString = JSON.stringify(routeJSON);

    // Check if routeJSON is exactly the same
    if (oldRole.routeJSON === newRouteJSONString) {
      return res.status(400).json({
        success: false,
        message: "No changes detected in routeJSON.",
      });
    }

    // Backup previous data
    await RoleBackup.create({
      role: oldRole.role,
      routeJSON: oldRole.routeJSON,
    });

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      id,
      {
        role,
        routeJSON: newRouteJSONString,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Role updated successfully.",
      data: updatedRole,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
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

    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    const exists = collections.some((c) => c.name === collectionName);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Collection '${collectionName}' not found.`,
      });
    }

    const data = await mongoose.connection.db.collection(collectionName).find({}).sort({ createdAt: -1 }).toArray();

    const orderedData = data.map((doc) => {
      const { createdAt, ...rest } = doc;
      return { createdAt, ...rest };
    });

    return res.status(200).json({
      success: true,
      collection: collectionName,
      total: orderedData.length,
      data: orderedData,
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
    const { userId, fcmTokens, body, title, type, autoReminderLimit } = req.body;

    const now = new Date();

    const originalMinute = now.getMinutes();

    // Add 30 seconds
    now.setSeconds(now.getSeconds() + 30);

    // If still in the same minute, move to the next minute
    if (now.getMinutes() === originalMinute) {
      now.setMinutes(now.getMinutes() + 1);
    }

    // Format date (YYYY-MM-DD)
    const notificationSendDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Format time (HH:mm)
    const notificationSendTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

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
      },
    );

    // Restart after response is sent (only if using nodemon/pm2)

    return res.status(200).json({
      success: true,
      message: "Notification saved successfully.",
      data: notification,
    });

    setTimeout(() => {
      // process.exit(0);
    }, 500);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

function containsKeyword(value, keyword) {
  if (value === null || value === undefined) return false;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).toLowerCase().includes(keyword);
  }

  if (value instanceof Date) {
    return value.toISOString().toLowerCase().includes(keyword);
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsKeyword(item, keyword));
  }

  if (typeof value === "object") {
    return Object.values(value).some((v) => containsKeyword(v, keyword));
  }

  return false;
}

internalUtilRoutes.get("/global-search/:keyword", async (req, res) => {
  const keyword = req.params.keyword.toLowerCase();

  try {
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();

    const results = {};

    await Promise.all(
      collections.map(async ({ name }) => {
        const docs = await mongoose.connection.db.collection(name).find({}).toArray();

        const matched = docs.filter((doc) => containsKeyword(doc, keyword));

        if (matched.length) {
          results[name] = matched;
        }
      }),
    );

    return res.json({
      success: true,
      results,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

internalUtilRoutes.get("/get-current-time", async (req, res) => {
  const now = new Date();

  const bdCurrentTime = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return res.json({
    success: true,
    data: bdCurrentTime,
  });
});




internalUtilRoutes.post("/update-role-route", async (req, res) => {
  const { role, routeJSON } = req.body;

  try {
    // Get the current role
    const existingRole = await Role.findOne({ role });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Backup the current role
    await BackupRole.findOneAndUpdate(
      { role: existingRole.role },
      {
        role: existingRole.role,
        routeJSON: existingRole.routeJSON,
      },
      {
        upsert: true,
        new: true,
      }
    );

    // Update the role
    const updatedRole = await Role.findOneAndUpdate(
      { role },
      { routeJSON },
      { new: true }
    );

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



export default internalUtilRoutes;

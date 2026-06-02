import express from "express";
import { exec } from "child_process";
import path from "path";
import PeriodTracker from "./../models/Period/PeriodModel.js";
import DoctorRegistration from "../models/DoctorRegistration/DoctorRegistration.js";

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

    exec(
      `node "${script}"`,
      { cwd: scriptsDir },
      (error, stdout, stderr) => {
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
      }
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to run script",
      error: error.message,
    });
  }
});


internalUtilRoutes.get("/all-types-of-user",async (req,res)=>{
  try{
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

export default internalUtilRoutes;
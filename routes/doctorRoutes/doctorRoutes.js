
import express from "express";
import { registerUser, loginUser } from "../../controllers/DoctorRegistration/doctorRegistration.js";
import { upload } from "../../middleware/upload.js";

const router = express.Router();

// 🔥 register route with image upload
router.post(
  "/register",
  upload.single("doctorIdCard"), // 👈 must match Postman key
  registerUser
);

router.post("/login", loginUser);

export default router;
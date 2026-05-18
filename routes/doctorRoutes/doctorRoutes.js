
import express from "express";
import { registerUser, loginUser } from "../../controllers/DoctorRegistration/doctorRegistration.js";
import { uploadImage } from "../../middleware/upload.js";

const router = express.Router();

// 🔥 register route with image upload
router.post(
  "/register",
  uploadImage.single("photo"), // 👈 must match Postman key
  registerUser
);

router.post("/login", loginUser);

export default router;
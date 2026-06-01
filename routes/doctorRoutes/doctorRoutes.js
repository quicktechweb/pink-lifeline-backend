import express from "express";
import { registerUser, loginUser, loginadmin, updateProfile, getProfile, getAllDoctors,  deleteDoctor, approveSingleDoctor } from "../../controllers/DoctorRegistration/doctorRegistration.js";
import { uploadImage } from "../../middleware/upload.js";
import { isUserExist } from "../../middleware/isUserExist.js";

const router = express.Router();

// 🔥 register route with image upload
router.post("/register", uploadImage.single("photo"), registerUser);

router.post("/login", loginUser);

router.post("/loginadmin", loginadmin);

router.post("/update-profile/:userId", uploadImage.single("doctorIdCard"), isUserExist, updateProfile);


router.get("/get-profile/:userId", isUserExist, getProfile);


router.get("/get-all-doctors",getAllDoctors)
router.put("/verify-doctor/:userId",isUserExist, approveSingleDoctor)
router.put("/delete-doctor/:userId", isUserExist, deleteDoctor)

export default router;

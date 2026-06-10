import express from "express";
import { isUserExist } from "../../middleware/isUserExist.js";
import { updateUserProfile, addToWishList, getUserDoctorWishList, getAllDoctors, getUserProfileInsights } from "../../controllers/User/userController.js";
import { uploadImage } from "../../middleware/upload.js";

const router = express.Router();

// router.put("/v1/update-user-profile/:userId", isUserExist, updateUserProfile);
router.post("/v1/add-doctor-wish-list/:userId", isUserExist, addToWishList);
router.get("/v1/get-user-doctor-list/:userId", isUserExist, getUserDoctorWishList);
router.get("/v1/get-all-doctors", getAllDoctors);
router.put("/v1/update-user-profile/:userId", uploadImage.single("profilePhoto"), isUserExist, updateUserProfile);
router.get("/v1/get-user-profile-insights/:userId", isUserExist, getUserProfileInsights);


export default router;

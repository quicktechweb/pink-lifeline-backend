import express from "express";
import { registerUser, loginUser ,loginadmin, updateProfile, getProfile} from "../../controllers/DoctorRegistration/doctorRegistration.js";
import { uploadImage } from "../../middleware/upload.js";
import { isUserExist } from "../../middleware/isUserExist.js";

const router = express.Router();

// 🔥 register route with image upload
router.post( "/register",uploadImage.single("photo"), registerUser);

router.post("/login", loginUser);


router.post("/loginadmin", loginadmin)

router.post("/update-profile/:userId",isUserExist,updateProfile)
router.get("/get-profile/:userId",isUserExist, getProfile)


export default router;

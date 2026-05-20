import express from "express";
import { registerUser, loginUser ,loginadmin} from "../../controllers/DoctorRegistration/doctorRegistration.js";
import { uploadImage } from "../../middleware/upload.js";

const router = express.Router();

// 🔥 register route with image upload
router.post( "/register",uploadImage.single("photo"), registerUser);

router.post("/login", loginUser);


router.post("/loginadmin", loginadmin)




export default router;

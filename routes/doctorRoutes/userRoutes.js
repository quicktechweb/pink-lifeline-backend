import express from "express";
import { isUserExist } from "../../middleware/isUserExist.js";
import { updateUserProfile, addToWishList, getUserDoctorWishList } from "../../controllers/User/userController.js";

const router = express.Router();

router.put("/v1/update-profile/:userId", isUserExist, updateUserProfile);
router.post("/v1/add-doctor-wish-list/:userId", isUserExist, addToWishList);
router.get("/v1/get-user-doctor-list/:userId", isUserExist, getUserDoctorWishList);

export default router;

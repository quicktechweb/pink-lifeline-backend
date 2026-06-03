
import express from "express";
import { isUserExist } from "../../middleware/isUserExist.js";
import { updateUserProfile } from "../../controllers/User/userController.js";




const router = express.Router();


router.put("/v1/update-profile/:userId", isUserExist, updateUserProfile )





export default router
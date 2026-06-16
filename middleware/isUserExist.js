
import User from "../models/DoctorRegistration/DoctorRegistration.js"
import { notFoundResponse } from "../utils/utils.js";

export const isUserExist =async (req,res,next) => {
    const { userId } = req.params;
    const isUserExist = await User.findOne({ userId });
    if (isUserExist) {
        next()
    }else{
        notFoundResponse(res,"User not found.","user not found.")
    }
} 
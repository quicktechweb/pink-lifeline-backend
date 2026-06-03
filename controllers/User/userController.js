import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { somethingWentWrong, successResponse } from "../../utils/utils.js";


export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, phoneNumber, autoReminderLimit, notificationPreferenceTime, dateOfBirth } = req.body;

    const updateData = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    // if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (autoReminderLimit !== undefined) updateData.autoReminderLimit = autoReminderLimit;



    if (notificationPreferenceTime !== undefined) {
        const date = new Date(notificationPreferenceTime);
        updateData.notificationPreferenceTime = date.toISOString().substring(11, 16);
    }


    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    

    const updatedUser = await User.findOneAndUpdate({ userId }, { $set: updateData },{ new: true });
    successResponse(res, updatedUser, "User profile updated successfully.", "User profile updated successfully.");

} catch (error) {

    somethingWentWrong(res, error, "Something went wrong.");

    }


};
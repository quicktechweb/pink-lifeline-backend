import express from "express";
import { isUserExist } from "../../middleware/isUserExist.js";
import { updateUserProfile, addToWishList, getUserDoctorWishList, getAllDoctors,getUserAppointments, getUserProfileInsights, bookAppointment, editAppointment,  removeFromWishList, getDailyScheduleByUser, completeAppointmentByUser, cancelAppointmentByUser, rateDoctorByUser, getUserAppointmentsByStatus, getAllUserInspectListByAdmin } from "../../controllers/User/userController.js";
import { uploadImage } from "../../middleware/upload.js";

const router = express.Router();

// router.put("/v1/update-user-profile/:userId", isUserExist, updateUserProfile);
router.post("/v1/add-doctor-wish-list/:userId", isUserExist, addToWishList);
router.post("/v1/remove-doctor-wish-list/:userId", isUserExist, removeFromWishList);
router.get("/v1/get-user-doctor-list/:userId", isUserExist, getUserDoctorWishList);
router.get("/v1/get-all-doctors", getAllDoctors);
router.put("/v1/update-user-profile/:userId", uploadImage.single("profilePhoto"), isUserExist, updateUserProfile);
router.get("/v1/get-user-profile-insights/:userId", isUserExist, getUserProfileInsights);



router.post("/v1/book-appointment",bookAppointment)
router.patch("/v1/cancel-appointment-by-user/:appointmentId",cancelAppointmentByUser)
router.patch("/v1/reschedule-appointment/:appointmentId", editAppointment)
router.get("/v1/get-user-appointments/:userId", isUserExist, getUserAppointments);
router.post("/v2/get-user-appointments/:userId", isUserExist, getUserAppointmentsByStatus);

router.post("/v1/get-daily-schedule-by-user/:doctorUserid", getDailyScheduleByUser);


router.post("/v1/complete-appointment-by-user/:appointmentId",completeAppointmentByUser);
// router.post("/v1/cancel-appointment-by-user/:appointmentId", deleteAppointment);
router.post("/v1/rate-doctor-by-user/:userId", isUserExist, rateDoctorByUser);

router.post("/v1/get-all-users-inspect-list-by-admin",getAllUserInspectListByAdmin)


export default router;

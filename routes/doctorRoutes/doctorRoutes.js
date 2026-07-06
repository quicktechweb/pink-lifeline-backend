import express from "express";
import { registerUser, searchDoctors,getDailyAppointments, addSchedule, loginUser, loginadmin, updateProfile, getProfile, getAllDoctors, deleteDoctor, approveSingleDoctor, getDoctorByRegistrationNumber, removeSchedule, addExceptionalSchedule, getDoctorMonthlySchedule, setDoctorScore, enableDisableWeekDay, getDailySchedule, removeExceptionalDay, getTotalCommentsPatients, addDoctorWeeklySchedule, getAllAppointmentsByAdmin, confirmAppointmentByAdmin, cancelAppointmentByAdmin, getAllDoctorByAdmin, saveFCMToken, loginByAdmin, signUpAsAdmin, getAllAdminUsers, logoutAdmin, updateAdminPassword, suspendUser, activateUser, deleteUser, updateRoleByAdmin, getDailyScheduleWithAppointments, getDoctorDetailsWithSchedule, getConfirmedAppointments, getCompletedAppointments, markNotificationAsRead, getAllNotificationsToAll, getDoctorUpcomingAppointments } from "../../controllers/DoctorRegistration/doctorRegistration.js";
import { uploadImage } from "../../middleware/upload.js";
import { isUserExist } from "../../middleware/isUserExist.js";
import { isDoctor } from "../../middleware/isDoctor.js";
import verifyToken from "../../middleware/jwt.js";

const router = express.Router();

router.post("/register", uploadImage.single("photo"), registerUser);

router.post("/login", loginUser);



router.post("/save-fcm-token/:userId",isUserExist,saveFCMToken)


router.post("/update-profile/:userId",uploadImage.fields([{ name: "doctorIdCard", maxCount: 1 },{ name: "profilePhoto", maxCount: 1 },]),isUserExist,updateProfile);

router.get("/get-profile/:userId", isUserExist, getProfile);

router.get("/get-all-doctors", getAllDoctors);
router.put("/verify-doctor/:userId", isUserExist, approveSingleDoctor);
router.put("/delete-doctor/:userId", isUserExist, deleteDoctor);
router.get("/get-doctor-by-registration-number/:doctorRegistrationNumber", getDoctorByRegistrationNumber);
router.get("/search-doctors/:query", searchDoctors);
router.post("/get-upcoming-appointments/:userId", isDoctor, getDoctorUpcomingAppointments);
router.put("/update-doctor-score/:userId", isUserExist, setDoctorScore);






// router.post("/show-doctor-weekly-schedule/:userId",isDoctor,getDoctorWeeklySchedule)
router.post("/add-doctor-daily-schedule/:userId", isDoctor, addSchedule);
router.delete("/remove-doctor-daily-schedule/:userId", isDoctor, removeSchedule);
router.patch("/enable-disable-week-day/:userId", isDoctor, enableDisableWeekDay);
router.post("/get-daily-schedule-by-doctor/:userId", isDoctor, getDailySchedule);
router.post("/get-doctor-monthly-schedule/:userId", isDoctor, getDoctorMonthlySchedule);
router.post("/add-exceptional-day/:userId", isDoctor, addExceptionalSchedule);
router.delete("/remove-exceptional-day/:userId", isDoctor, removeExceptionalDay);

router.post("/add-doctor-weekly-schedule/:userId", isDoctor, addDoctorWeeklySchedule);

router.get("/get-total-comment-patients/:userId",isDoctor,getTotalCommentsPatients);


router.post("/get-daily-doctor-appointments/:userId", isDoctor, getDailyAppointments);

router.post("/get-daily-confirmed-appointments-by-doctor/:userId", isDoctor, getConfirmedAppointments);
router.post("/get-completed-appointments-by-doctor/:userId", isDoctor, getCompletedAppointments);
router.get("/get-all-notification/:userId",isUserExist,getAllNotificationsToAll)
router.post("/mark-notification-as-read/:userId",isUserExist,markNotificationAsRead)




// admin sections


// router.post("/loginadmin", loginadmin);


router.post("/get-all-appointments-by-admin",getAllAppointmentsByAdmin)


router.post("/confirm-appointment-by-admin/:id",confirmAppointmentByAdmin);
router.post("/cancel-appointment-by-admin/:id",cancelAppointmentByAdmin);
router.post("/get-all-doctors-by-admin", getAllDoctorByAdmin);




router.post("/login-by-admin",loginByAdmin)


router.post("/reset-password-by-admin/:userId",isUserExist,updateAdminPassword)
router.post("/logout-by-admin", logoutAdmin);

router.post("/get-all-admin-users/:userId",isUserExist,getAllAdminUsers)

router.post("/suspend-user-by-admin/:userId",isUserExist,suspendUser)
router.post("/active-a-user-by-admin/:userId",isUserExist,activateUser)
router.delete("/delete-user-by-admin/:userId",isUserExist,deleteUser)
router.patch("/update-role-by-admin/:userId",isUserExist,updateRoleByAdmin)
router.post("/create-admin-by-admin",uploadImage.single("profilePhoto"),signUpAsAdmin)
router.post("/get-daily-schedule-appointments/:userId", getDailyScheduleWithAppointments);
router.post("/doctor-details-schedule/:userId",isDoctor,getDoctorDetailsWithSchedule)




// router



export default router;

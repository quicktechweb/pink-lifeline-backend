import express from "express";
import { registerUser, searchDoctors,getDailyAppointments, addSchedule, loginUser, loginadmin, updateProfile, getProfile, getAllDoctors, deleteDoctor, approveSingleDoctor, getDoctorByRegistrationNumber, removeSchedule, addExceptionalSchedule, getDoctorMonthlySchedule, setDoctorScore, enableDisableWeekDay, getDailySchedule, removeExceptionalDay, getTotalCommentsPatients, addDoctorWeeklySchedule } from "../../controllers/DoctorRegistration/doctorRegistration.js";
import { uploadImage } from "../../middleware/upload.js";
import { isUserExist } from "../../middleware/isUserExist.js";
import { isDoctor } from "../../middleware/isDoctor.js";

const router = express.Router();

router.post("/register", uploadImage.single("photo"), registerUser);

router.post("/login", loginUser);

router.post("/loginadmin", loginadmin);

router.post("/update-profile/:userId",uploadImage.fields([{ name: "doctorIdCard", maxCount: 1 },{ name: "profilePhoto", maxCount: 1 },]),isUserExist,updateProfile);

router.get("/get-profile/:userId", isUserExist, getProfile);

router.get("/get-all-doctors", getAllDoctors);
router.put("/verify-doctor/:userId", isUserExist, approveSingleDoctor);
router.put("/delete-doctor/:userId", isUserExist, deleteDoctor);
router.get("/get-doctor-by-registration-number/:doctorRegistrationNumber", getDoctorByRegistrationNumber);
router.get("/search-doctors/:query", searchDoctors);

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




export default router;

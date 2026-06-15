import express from "express";
import { getAppointmentStatusPieChartData, getDoctorPatientAppointmentCounts } from "../../controllers/DashboardStat/dashboardStatController.js";

const router = express.Router();

router.get("/v1/get-doctor-patient-appointment-counts", getDoctorPatientAppointmentCounts);
router.get("/v1/get-all-types-appointment-counts", getAppointmentStatusPieChartData);
router.get("/v1/get-appointment-trends-over-time", getAppointmentStatusPieChartData);

export default router
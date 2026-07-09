import express from 'express';
import {
  allUserPeriodCycleLength,
  getAllDoctorPatientsRatio,
  getAppointmentStatusPieChartData,
  getAppointmentTrendsOverTime,
  getDoctorPatientAppointmentCounts,
  getTopDoctorServedPatients,
} from '../../controllers/DashboardStat/dashboardStatController.js';

const router = express.Router();

router.get(
  '/v1/get-doctor-patient-appointment-counts',
  getDoctorPatientAppointmentCounts
);
router.get(
  '/v1/get-all-types-appointment-counts',
  getAppointmentStatusPieChartData
);
router.get('/v1/top-doctors-served-patients', getTopDoctorServedPatients);
router.get('/v1/get-all-user-period-cycle-length', allUserPeriodCycleLength);
router.get('/v1/doctor-patient-ration', getAllDoctorPatientsRatio);
router.post(
  '/v1/get-appointment-trends-over-time',
  getAppointmentTrendsOverTime
);

export default router;

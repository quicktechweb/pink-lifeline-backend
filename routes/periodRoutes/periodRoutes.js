import express from "express";
import { recordPeriodLog,getPeriodData, getPeriodBasicInsights } from "../../controllers/Period/trackPeriod/trackPeriod.js";


const router = express.Router();



router.patch("/v1/insert-period", recordPeriodLog);
router.post("/v1/get-period-info-date-wise",getPeriodData)
router.post("/v1/get-period-basics-insights",getPeriodBasicInsights)


export default router;
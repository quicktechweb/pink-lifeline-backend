import express from "express";
import { recordPeriodLog,getPeriodData, getPeriodBasicInsights, previousPeriodsInfo, addDailyNote } from "../../controllers/Period/trackPeriod/trackPeriod.js";
import { isUserExist } from "../../middleware/isUserExist.js";


const router = express.Router();



router.post("/v1/insert-period", recordPeriodLog);




router.get("/v1/get-period-basics-insights/:userId",isUserExist,getPeriodBasicInsights)






router.post("/v1/get-period-info-date-wise",getPeriodData)
router.post("/v1/add-daily-notes/:userId",isUserExist,addDailyNote)






router.get("/v1/previous-periods/:userId",isUserExist,previousPeriodsInfo)



export default router;
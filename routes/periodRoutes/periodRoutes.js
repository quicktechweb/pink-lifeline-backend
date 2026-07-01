import express from "express";
import { recordPeriodLog,getPeriodData, getPeriodBasicInsights, previousPeriodsInfo, addDailyNote, getPeriodBasicInsightsV2 } from "../../controllers/Period/trackPeriod/trackPeriod.js";
import { isUserExist } from "../../middleware/isUserExist.js";
import { recordPeriodStart,recordPeriodCurrent ,recordPeriodEnd  } from "../../controllers/Period/trackPeriod/trackPeriod2.js";


const router = express.Router();



router.post("/v1/insert-period", recordPeriodLog);






router.post("/v1/record-start-data",recordPeriodStart)
router.post("/v1/record-current-data",recordPeriodCurrent)
router.post("/v1/record-end-data",recordPeriodEnd)







router.get("/v1/get-period-basics-insights/:userId",isUserExist,getPeriodBasicInsights)
router.get("/v2/get-period-basics-insights/:userId",isUserExist,getPeriodBasicInsightsV2)




router.post("/v1/get-period-info-date-wise",getPeriodData)
router.post("/v1/add-daily-notes/:userId",isUserExist,addDailyNote)





router.get("/v1/previous-periods/:userId",isUserExist,previousPeriodsInfo)



export default router;
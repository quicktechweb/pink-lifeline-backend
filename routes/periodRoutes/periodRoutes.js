import express from "express";
import { trackPeriod } from "../../controllers/Period/trackPeriod/trackPeriod.js";


const router = express.Router();



router.post("/v1/insert-period", trackPeriod);


export default router;
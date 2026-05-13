import express from "express";
import { trackPeriod } from "../../controllers/Period/trackPeriod/trackPeriod.js";


const router = express.Router();



router.post("/v1/track-period", trackPeriod);

export default router;
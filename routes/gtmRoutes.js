import express from "express";
import { saveOrUpdateGtm, getGtm } from "../controllers/gtmController.js";

const router = express.Router();

// POST /api/settings/gtm
router.post("/gtm", saveOrUpdateGtm);

// GET /api/settings/gtm
router.get("/gtm", getGtm);

export default router;
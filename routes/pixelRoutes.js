import express from "express";
import { saveOrUpdatePixel, getPixel } from "../controllers/pixelController.js";

const router = express.Router();

router.get("/pixel", getPixel);
router.post("/pixel", saveOrUpdatePixel);

export default router;

import express from "express";
import {
  getCampaigns,
  addCampaign,
  updateCampaign,
  deleteCampaign,
} from "../controllers/campaignController.js";

const router = express.Router();

router.get("/", getCampaigns);
router.post("/", addCampaign);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);

export default router;

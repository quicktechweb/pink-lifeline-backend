import express from "express";
const router = express.Router();
import  TermsCondition from "../models/TermsCondition.js";

// GET Terms & Conditions
router.get("/", async (req, res) => {
  try {
    const data = await TermsCondition.findOne({});
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PUT Terms & Conditions
router.put("/:id", async (req, res) => {
  try {
    const updated = await TermsCondition.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Update failed" });
  }
});

export default router;

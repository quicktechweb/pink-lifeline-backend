import express from "express";
import Footer from "../models/Footer.js";

const router = express.Router();

// Get Footer (latest one)
router.get("/", async (req, res) => {
  try {
    const footer = await Footer.findOne().sort({ createdAt: -1 });
    if (!footer) {
      return res.status(404).json({ success: false, message: "Footer not found" });
    }
    res.json({ success: true, footer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Footer
router.put("/:id", async (req, res) => {
  try {
    const footer = await Footer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!footer) {
      return res.status(404).json({ success: false, message: "Footer not found" });
    }
    res.json({ success: true, footer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

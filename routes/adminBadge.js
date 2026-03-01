import express from "express";
import BadgeLevel from "../models/BadgeLevel.js";

const router = express.Router();

// ✅ Get all badge levels
router.get("/", async (req, res) => {
  try {
    const badges = await BadgeLevel.find({}).sort({ minCount: 1 });
    res.json({ success: true, badges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Create new badge
router.post("/", async (req, res) => {
  const { name, minCount, maxCount } = req.body;
  try {
    const existing = await BadgeLevel.findOne({ name });
    if (existing) return res.status(400).json({ success: false, message: "Badge name already exists" });

    const badge = new BadgeLevel({ name, minCount, maxCount });
    await badge.save();
    res.json({ success: true, badge });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Update badge
router.put("/:id", async (req, res) => {
  const { name, minCount, maxCount } = req.body;
  try {
    const badge = await BadgeLevel.findById(req.params.id);
    if (!badge) return res.status(404).json({ success: false, message: "Badge not found" });

    badge.name = name || badge.name;
    badge.minCount = minCount || badge.minCount;
    badge.maxCount = maxCount || badge.maxCount;

    await badge.save();
    res.json({ success: true, badge });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Delete badge
router.delete("/:id", async (req, res) => {
  try {
    const badge = await BadgeLevel.findByIdAndDelete(req.params.id);
    if (!badge) return res.status(404).json({ success: false, message: "Badge not found" });
    res.json({ success: true, message: "Badge deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

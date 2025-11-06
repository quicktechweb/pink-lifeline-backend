import express from "express";
import Carousel from "../models/Carousel.js";

const router = express.Router();

// ✅ Get all
router.get("/", async (req, res) => {
  try {
    const data = await Carousel.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update one
router.put("/:id", async (req, res) => {
  try {
    const updated = await Carousel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

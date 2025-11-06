import express from "express";
import AboutUs from "../models/AboutUs.js";

const router = express.Router();

// GET AboutUs — full data including contact.methods
router.get("/", async (req, res) => {
  try {
    // Always return the first document (assuming single about page)
    const about = await AboutUs.findOne({});
    if (!about) {
      return res.status(404).json({ message: "AboutUs data not found" });
    }
    res.json(about);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT — Update AboutUs (full data including methods)
router.put("/", async (req, res) => {
  try {
    const data = req.body;
    let about = await AboutUs.findOne({});
    if (!about) {
      about = new AboutUs(data);
    } else {
      Object.assign(about, data);
    }
    await about.save();
    res.json(about);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

import express from "express";
import Banner from "../models/BannerAdvertisement.js";

const router = express.Router();

// ✅ Get all banners
router.get("/", async (req, res) => {
  try {
    const banners = await Banner.find({});
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Create new banner
router.post("/", async (req, res) => {
  try {
    const newBanner = new Banner(req.body);
    await newBanner.save();
    res.json({ message: "Banner created successfully", data: newBanner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Update banner (edit)
router.put("/:id", async (req, res) => {
  try {
    const updated = await Banner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ message: "Banner updated", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Delete banner
router.delete("/:id", async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: "Banner deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

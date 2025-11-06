import express from "express";
import PromoSection from "../models/PromoSection.js";

const router = express.Router();

// 🟢 Get Promo Section
router.get("/", async (req, res) => {
  try {
    const data = await PromoSection.findOne();
    if (!data) {
      const created = await PromoSection.create({
        bannerImages: [],
        sidePromo: {},
      });
      return res.json(created);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 Add a banner
router.post("/banner", async (req, res) => {
  try {
    const { image } = req.body;
    const section = await PromoSection.findOne();
    section.bannerImages.push(image);
    await section.save();
    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 Update banner by index
router.put("/banner/:index", async (req, res) => {
  try {
    const { index } = req.params;
    const { image } = req.body;
    const section = await PromoSection.findOne();
    section.bannerImages[index] = image;
    await section.save();
    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 Delete banner
router.delete("/banner/:index", async (req, res) => {
  try {
    const { index } = req.params;
    const section = await PromoSection.findOne();
    section.bannerImages.splice(index, 1);
    await section.save();
    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 Update side promo (only update allowed)
router.put("/sidepromo", async (req, res) => {
  try {
    const { image, alt } = req.body;
    const section = await PromoSection.findOne();
    section.sidePromo = { image, alt };
    await section.save();
    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

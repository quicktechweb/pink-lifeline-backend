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
    const { image, link } = req.body;

    const section = await PromoSection.findOne();
    section.bannerImages.push({ image, link });
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
    const { image, link } = req.body;

    const section = await PromoSection.findOne();
    section.bannerImages[index] = { image, link };

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

// 🟢 Update side promo (image, link, alt)
router.put("/sidepromo", async (req, res) => {
  try {
    const { image, link, alt } = req.body;
    const section = await PromoSection.findOne();

    section.sidePromo = { image, link, alt };
    await section.save();

    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 Delete side promo
router.delete("/sidepromo", async (req, res) => {
  try {
    const section = await PromoSection.findOne();
    section.sidePromo = { image: "", link: "", alt: "" };
    await section.save();

    res.json(section);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

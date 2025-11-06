import express from "express";
import PromoCardSection from "../models/PromoCardSection.js";

const router = express.Router();

// ---------- GET ALL ----------
router.get("/", async (req, res) => {
  try {
    let section = await PromoCardSection.findOne();
    if (!section) {
      // If not exist, create default structure
      section = new PromoCardSection({
        promoCards: [
          { id: 1, position: "left", alt: "Left promo banner" },
          { id: 2, position: "middle", images: [], alt: "Middle rotating banner" },
          { id: 3, position: "right", alt: "Right promo banner" },
        ],
      });
      await section.save();
    }
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UPDATE LEFT ----------
router.put("/left", async (req, res) => {
  const { image, alt } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const left = section.promoCards.find((c) => c.position === "left");
    left.image = image;
    left.alt = alt;
    await section.save();
    res.json(left);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UPDATE RIGHT ----------
router.put("/right", async (req, res) => {
  const { image, alt } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const right = section.promoCards.find((c) => c.position === "right");
    right.image = image;
    right.alt = alt;
    await section.save();
    res.json(right);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- MIDDLE ----------

// Add middle card
router.post("/middle", async (req, res) => {
  const { image } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const middle = section.promoCards.find((c) => c.position === "middle");
    middle.images.push(image);
    await section.save();
    res.json(middle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update middle card
router.put("/middle/:index", async (req, res) => {
  const { index } = req.params;
  const { image } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const middle = section.promoCards.find((c) => c.position === "middle");
    middle.images[index] = image;
    await section.save();
    res.json(middle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete middle card
router.delete("/middle/:index", async (req, res) => {
  const { index } = req.params;
  try {
    const section = await PromoCardSection.findOne();
    const middle = section.promoCards.find((c) => c.position === "middle");
    middle.images.splice(index, 1);
    await section.save();
    res.json(middle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

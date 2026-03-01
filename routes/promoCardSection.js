import express from "express";
import PromoCardSection from "../models/PromoCardSection.js";

const router = express.Router();

// ---------- GET ALL ----------
router.get("/", async (req, res) => {
  try {
    let section = await PromoCardSection.findOne();
    if (!section) {
      section = new PromoCardSection({
        promoCards: [
          { id: 1, position: "left", image: "", link: "", alt: "Left promo banner" },
          { id: 2, position: "middle", images: [], alt: "Middle rotating banners" }, // array of {image, link}
          { id: 3, position: "right", image: "", link: "", alt: "Right promo banner" },
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
  const { image, link, alt } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const left = section.promoCards.find((c) => c.position === "left");
    if (!left) return res.status(404).json({ message: "Left card not found" });

    if (image !== undefined) left.image = image;
    if (link !== undefined) left.link = link;
    if (alt !== undefined) left.alt = alt;

    await section.save();
    res.json(left);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UPDATE RIGHT ----------
router.put("/right", async (req, res) => {
  const { image, link, alt } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const right = section.promoCards.find((c) => c.position === "right");
    if (!right) return res.status(404).json({ message: "Right card not found" });

    if (image !== undefined) right.image = image;
    if (link !== undefined) right.link = link;
    if (alt !== undefined) right.alt = alt;

    await section.save();
    res.json(right);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- MIDDLE ----------

// Add middle card
router.post("/middle", async (req, res) => {
  const { image, link } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const middle = section.promoCards.find((c) => c.position === "middle");
    if (!middle) return res.status(404).json({ message: "Middle card not found" });

    middle.images.push({ image: image || "", link: link || "" });
    await section.save();
    res.json(middle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update middle card by index
router.put("/middle/:index", async (req, res) => {
  const { index } = req.params;
  const { image, link } = req.body;
  try {
    const section = await PromoCardSection.findOne();
    const middle = section.promoCards.find((c) => c.position === "middle");
    if (!middle || !middle.images[index]) return res.status(404).json({ message: "Middle card image not found" });

    if (image !== undefined) middle.images[index].image = image;
    if (link !== undefined) middle.images[index].link = link;

    await section.save();
    res.json(middle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete middle card by index
router.delete("/middle/:index", async (req, res) => {
  const { index } = req.params;
  try {
    const section = await PromoCardSection.findOne();
    const middle = section.promoCards.find((c) => c.position === "middle");
    if (!middle || !middle.images[index]) return res.status(404).json({ message: "Middle card image not found" });

    middle.images.splice(index, 1);
    await section.save();
    res.json(middle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

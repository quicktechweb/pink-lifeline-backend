import express from "express";
import Banner from "../models/Banner.js";

const router = express.Router();

// ✅ Get all
router.get("/", async (req, res) => {
  try {
    const banners = await Banner.find({});
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update all or specific fields
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    update.updatedAt = new Date();

    const updated = await Banner.findOneAndUpdate({ _id: id }, update, {
      new: true,
      upsert: true,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update background images
router.put("/:id/update-background", async (req, res) => {
  try {
    const { id } = req.params;
    const { backgroundData } = req.body;

    if (!Array.isArray(backgroundData))
      return res.status(400).json({ message: "backgroundData must be an array" });

    const banner = await Banner.findById(id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });

    banner.backgroundData = backgroundData;
    banner.updatedAt = new Date();
    await banner.save();

    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Add new card
router.post("/:parentId/data/:bannerId/card", async (req, res) => {
  try {
    const { parentId, bannerId } = req.params;
    const { footer } = req.body;

    const parent = await Banner.findById(parentId);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    const bannerBlock = parent.data.find((b) => b._id.toString() === bannerId);
    if (!bannerBlock) return res.status(404).json({ message: "Banner block not found" });

    bannerBlock.cardsData.push({ footer, items: [] });
    parent.updatedAt = new Date();
    await parent.save();

    res.json(parent);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete card
router.delete("/:parentId/data/:bannerId/card/:cardId", async (req, res) => {
  try {
    const { parentId, bannerId, cardId } = req.params;
    const parent = await Banner.findById(parentId);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    const bannerBlock = parent.data.find((b) => b._id.toString() === bannerId);
    if (!bannerBlock) return res.status(404).json({ message: "Banner block not found" });

    bannerBlock.cardsData = bannerBlock.cardsData.filter(
      (c) => c._id.toString() !== cardId
    );
    parent.updatedAt = new Date();
    await parent.save();

    res.json(parent);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Add new item
router.post("/:parentId/data/:bannerId/card/:cardId/item", async (req, res) => {
  try {
    const { parentId, bannerId, cardId } = req.params;
    const payload = req.body;

    const parent = await Banner.findById(parentId);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    const bannerBlock = parent.data.find((b) => b._id.toString() === bannerId);
    if (!bannerBlock) return res.status(404).json({ message: "Banner block not found" });

    const card = bannerBlock.cardsData.find((c) => c._id.toString() === cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });

    card.items.push(payload);
    parent.updatedAt = new Date();
    await parent.save();

    res.json(parent);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update specific item
router.put("/:parentId/data/:bannerId/card/:cardId/item/:itemId", async (req, res) => {
  try {
    const { parentId, bannerId, cardId, itemId } = req.params;
    const payload = req.body;

    const parent = await Banner.findById(parentId);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    const bannerBlock = parent.data.find((b) => b._id.toString() === bannerId);
    if (!bannerBlock) return res.status(404).json({ message: "Banner block not found" });

    const card = bannerBlock.cardsData.find((c) => c._id.toString() === cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });

    const item = card.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // -------------------------
    // 1️⃣ Item update
    // -------------------------
    Object.assign(item, payload);

    // -------------------------
    // 2️⃣ Parent category update
    // -------------------------
    if (payload.category) {
      bannerBlock.category = payload.category;
    }
    if (payload.subCategory) {
      bannerBlock.subCategory = payload.subCategory;
    }

    parent.updatedAt = new Date();
    await parent.save();

    res.json(parent);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Delete specific item
router.delete("/:parentId/data/:bannerId/card/:cardId/item/:itemId", async (req, res) => {
  try {
    const { parentId, bannerId, cardId, itemId } = req.params;

    const parent = await Banner.findById(parentId);
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    const bannerBlock = parent.data.find((b) => b._id.toString() === bannerId);
    if (!bannerBlock) return res.status(404).json({ message: "Banner block not found" });

    const card = bannerBlock.cardsData.find((c) => c._id.toString() === cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });

    card.items = card.items.filter((i) => i._id.toString() !== itemId);
    parent.updatedAt = new Date();
    await parent.save();

    res.json(parent);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

// routes/topSelling.js
import express from "express";
import TopSelling from "../models/TopSelling.js";

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  try {
    const item = await TopSelling.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const updated = await TopSelling.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL (সর্বশেষ আগে)
router.get("/", async (_, res) => {
  try {
    const items = await TopSelling.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await TopSelling.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

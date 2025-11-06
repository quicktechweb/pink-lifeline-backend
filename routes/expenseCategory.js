import express from "express";
import ExpenseCategory from "../models/ExpenseCategory.js";

const router = express.Router();

// GET all categories
router.get("/", async (req, res) => {
  try {
    const categories = await ExpenseCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new category
router.post("/", async (req, res) => {
  try {
    const newCategory = await ExpenseCategory.create(req.body);
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE category
router.put("/:id", async (req, res) => {
  try {
    const updated = await ExpenseCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE category
router.delete("/:id", async (req, res) => {
  try {
    await ExpenseCategory.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

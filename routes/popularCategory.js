import express from "express";
import PopularCategory from "../models/PopularCategory.js";

const router = express.Router();

// GET all categories
router.get("/", async (req, res) => {
  try {
    const data = await PopularCategory.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD category
router.post("/", async (req, res) => {
  try {
    const { name, icon } = req.body;
    let data = await PopularCategory.findOne();
    if (!data) {
      data = new PopularCategory({ categories: [] });
    }
    data.categories.push({ name, icon });
    await data.save();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE category
router.put("/:index", async (req, res) => {
  try {
    const { name, icon } = req.body;
    const { index } = req.params;
    const data = await PopularCategory.findOne();
    if (!data) return res.status(404).json({ message: "Data not found" });
    if (!data.categories[index]) return res.status(404).json({ message: "Category not found" });

    data.categories[index].name = name;
    data.categories[index].icon = icon;

    await data.save();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE category
router.delete("/:index", async (req, res) => {
  try {
    const { index } = req.params;
    const data = await PopularCategory.findOne();
    if (!data) return res.status(404).json({ message: "Data not found" });
    data.categories.splice(index, 1);
    await data.save();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

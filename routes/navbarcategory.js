import express from "express";
const router = express.Router();
import NavbarCategory from "../models/NavbarCategory.js";


// 🟢 GET all categories
router.get("/", async (req, res) => {
  try {
    const categories = await NavbarCategory.find({});
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🟢 POST selected categories
router.post("/select", async (req, res) => {
  try {
    const { firstChoiceSelected = [], secondChoiceSelected = [] } = req.body;

    const newCategoryDocs = firstChoiceSelected.map((categoryName) => ({
      categoryName,
      type: "newCategory",
    }));

    const moreItemDocs = secondChoiceSelected.map((categoryName) => ({
      categoryName,
      type: "moreItem",
    }));

    const allDocs = [...newCategoryDocs, ...moreItemDocs];

    const inserted = await NavbarCategory.insertMany(allDocs);

    res.json({ message: "✅ Categories saved successfully", data: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔵 PUT (Edit / Update) category by ID
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const updated = await NavbarCategory.findByIdAndUpdate(
      id,
      { categoryName },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "✅ Category updated successfully", data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔴 DELETE single category by ID
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NavbarCategory.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "✅ Category deleted successfully", data: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🟠 DELETE all categories (optional clear)
router.delete("/clear", async (req, res) => {
  try {
    await NavbarCategory.deleteMany({});
    res.json({ message: "All categories cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;

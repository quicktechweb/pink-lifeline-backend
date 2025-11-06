import express from "express";
import HomeBrand from "../models/homeBrandModel.js";

const router = express.Router();

// ✅ Get all brands
router.get("/", async (req, res) => {
  try {
    const brands = await HomeBrand.find();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Add new brand
router.post("/", async (req, res) => {
  try {
    const newBrand = new HomeBrand({
      brandName: req.body.brandName,
      brandImg: req.body.brandImg,
    });
    await newBrand.save();
    res.status(201).json(newBrand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ✅ Update brand by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedBrand = await HomeBrand.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedBrand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ✅ Delete brand
router.delete("/:id", async (req, res) => {
  try {
    await HomeBrand.findByIdAndDelete(req.params.id);
    res.json({ message: "Brand deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;

import Brand from "../models/Brand.js";
// ✅ Get all brands
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Add new brand
export const addBrand = async (req, res) => {
  try {
    const brand = new Brand(req.body);
    const saved = await brand.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Update brand
export const updateBrand = async (req, res) => {
  try {
    const updated = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Brand not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Delete brand
export const deleteBrand = async (req, res) => {
  try {
    const deleted = await Brand.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Brand not found" });
    res.json({ message: "Brand deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

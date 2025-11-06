import Subcategory from "../models/Subcategory.js";

// Create
export const createSubcategory = async (req, res) => {
  try {
    const { name, categoryName, status, subcategoryImg } = req.body;

    if (!subcategoryImg) {
      return res.status(400).json({ message: "Subcategory image is required" });
    }

    const newSub = new Subcategory({ name, categoryName, status, subcategoryImg });
    await newSub.save();

    res.status(201).json(newSub);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Read
export const getSubcategories = async (req, res) => {
  try {
    const subs = await Subcategory.find();
    res.json(subs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update
export const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryName, status, subcategoryImg } = req.body;

    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { name, categoryName, status, subcategoryImg },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete
export const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Subcategory.findByIdAndDelete(id);
    res.json({ message: "Subcategory deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

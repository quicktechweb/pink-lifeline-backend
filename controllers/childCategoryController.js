// controllers/childCategoryController.js
import ChildCategory from "../models/ChildCategory.js";

// ✅ Create
export const createChildCategory = async (req, res) => {
  try {
    const { name, categoryName, subcategoryName, status,childCategoryImg } = req.body;

    const newChild = new ChildCategory({ name, categoryName, subcategoryName, status,childCategoryImg });
    await newChild.save();

    res.status(201).json(newChild);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Read
export const getChildCategories = async (req, res) => {
  try {
    const children = await ChildCategory.find();
    res.json(children);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update
export const updateChildCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryName, subcategoryName, status,childCategoryImg } = req.body;

    const updated = await ChildCategory.findByIdAndUpdate(
      id,
      { name, categoryName, subcategoryName, status,childCategoryImg },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete
export const deleteChildCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await ChildCategory.findByIdAndDelete(id);
    res.json({ message: "Child Category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

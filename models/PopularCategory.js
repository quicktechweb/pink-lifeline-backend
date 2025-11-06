import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true }
});

const popularCategorySchema = new mongoose.Schema({
  categories: [categorySchema]
});

export default mongoose.model("PopularCategory", popularCategorySchema, "popularcategory");

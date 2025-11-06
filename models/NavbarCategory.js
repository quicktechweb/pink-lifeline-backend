import mongoose from "mongoose";

const navbarCategorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true },
  type: { type: String, enum: ["newCategory", "moreItem"], required: true },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("NavbarCategory", navbarCategorySchema,"navbarcategories");

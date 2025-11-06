import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  categoryName: { type: String, required: true }, // store category name
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  subcategoryImg: { type: String, required: true }, // image URL
}, { timestamps: true });

export default mongoose.model("Subcategory", subcategorySchema);

import mongoose from "mongoose";

const childCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  categoryName: { type: String, required: true },
  subcategoryName: { type: String, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  childCategoryImg: { type: String, default: "" }, // new field
});

export default mongoose.model("ChildCategory", childCategorySchema);

import mongoose from "mongoose";
const brandSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Inactive" },
    brandImg: { type: String }, // image url from imgbb
    category: { type: String, trim: true }, // ✅ category name
  },
  { timestamps: true }
);

const Brand = mongoose.model("Brand", brandSchema);

export default Brand;
import mongoose from "mongoose";

const allProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },
    childcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "ChildCategory" },
    productPrice: { type: Number, required: true },
    oldPrice: Number,
    discount: String,
    rating: Number,
    sold: Number,
    shop: String,
    totalcupon: Number,
    remaining: Number,
    solds: Number,
    save: String,
    img: String,
  },
  { timestamps: true }
);

// Prevent model overwrite
const AllProduct = mongoose.models.AllProduct || mongoose.model("AllProduct", allProductSchema);

export default AllProduct;

// models/TopSelling.js
import mongoose from "mongoose";

const topSellingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    categoryName: String,
    subcategoryName: String,
    childcategoryName: String,
    productPrice: Number,
    oldPrice: Number,
    discount: String,
    rating: Number,
    sold: Number,
    shop: String,
    totalcupon: Number,
    remaining: Number,
    solds: Number,
    save: String,
    // single string এর বদলে array
    images: [String],
  },
  { timestamps: true }
);

// তৃতীয় আর্গুমেন্ট "topselling" দেওয়ার ফলে MongoDB তে
// collection এর নাম ঠিক topselling হবে
export default mongoose.model("TopSelling", topSellingSchema, "topselling");

// models/CategoryBanner.js
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  img: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String },
  subCategory: { type: String },
});

const cardSchema = new mongoose.Schema({
  title: String,
  footer: String,
  items: [itemSchema],
});

const categoryBannerSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    childCategory: { type: String },
    backgroundImages: [String],
    cardsData: [cardSchema],
  },
  { timestamps: true }
);

export default mongoose.model(
  "CategoryBanner",
  categoryBannerSchema,
  "categorybanner"
);

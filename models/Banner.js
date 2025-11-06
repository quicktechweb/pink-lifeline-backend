import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  img: { type: String, default: "" },
  title: { type: String, default: "" },
  category: { type: String, default: "" },
  subCategory: { type: String, default: "" },
}, { _id: true });

const CardSchema = new mongoose.Schema({
  footer: { type: String, default: "" },
  items: [ItemSchema],
}, { _id: true });

const BannerSchema = new mongoose.Schema({
  category: { type: String, default: "" },
  subCategory: { type: String, default: "" },
  cardsData: [CardSchema],
}, { _id: true });

const ParentBannerSchema = new mongoose.Schema({
  backgroundData: { type: [String], default: [] },
  data: [BannerSchema],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("Banner", ParentBannerSchema, "categorybanner");

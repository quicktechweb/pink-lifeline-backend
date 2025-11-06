import mongoose from "mongoose";

const promoSectionSchema = new mongoose.Schema({
  bannerImages: { type: [String], default: [] },
  sidePromo: {
    image: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
});

export default mongoose.model("promosection", promoSectionSchema,"promosection");

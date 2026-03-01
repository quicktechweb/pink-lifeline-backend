import mongoose from "mongoose";

const promoSectionSchema = new mongoose.Schema({
  bannerImages: [
    {
      image: { type: String, default: "" },
      link: { type: String, default: "" },
    }
  ],

  sidePromo: {
    image: { type: String, default: "" },
    link: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
});

export default mongoose.model("promosection", promoSectionSchema,"promosection");

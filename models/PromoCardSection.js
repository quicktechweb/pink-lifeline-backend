import mongoose from "mongoose";

const PromoCardSectionSchema = new mongoose.Schema({
  promoCards: [
    {
      id: Number,
      position: String,
      image: String,
      images: [String],
      alt: String,
    },
  ],
});

export default mongoose.model("PromoCardSection", PromoCardSectionSchema,"promocardsection");

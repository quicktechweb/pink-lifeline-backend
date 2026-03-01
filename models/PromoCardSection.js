import mongoose from "mongoose";

const PromoCardSectionSchema = new mongoose.Schema({
  promoCards: [
    {
      id: Number,
      position: String,       // left, middle, right
      image: { type: String, default: "" },  // For left/right single image
      link: { type: String, default: "" },   // For left/right link
      images: [
        {
          image: { type: String, default: "" }, // Middle images
          link: { type: String, default: "" },  // Middle links
        },
      ],
      alt: { type: String, default: "" },
    },
  ],
});

export default mongoose.model(
  "PromoCardSection",
  PromoCardSectionSchema,
  "promocardsection"
);

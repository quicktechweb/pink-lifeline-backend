import mongoose from "mongoose";

const textSchema = new mongoose.Schema({
  icon: String,
  text: String,
  highlight: String,
  highlightColor: String,
  emoji: String,
});

const bannerAdvertisementSchema = new mongoose.Schema({
  leftBanner: {
    image: String,
    alt: String,
    link: String,
  },
  middleBanner: {
    texts: [textSchema],
  },
  rightBanner: {
    image: String,
    alt: String,
    link: String,
  },
  style: {
    background: String,
    animation: String,
  },
});

export default mongoose.model("BannerAdvertisement", bannerAdvertisementSchema, "banneradvertisments");

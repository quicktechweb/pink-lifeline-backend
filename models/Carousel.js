import mongoose from 'mongoose';

const carouselSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    buttonText: { type: String },
    img1: { type: String, required: true },
  },
  { timestamps: true }
);

// module.exports = mongoose.model("Carousel", carouselSchema,"productcarousel");
const Carousel = mongoose.model("Carousel", carouselSchema, "productcarousel");
export default Carousel;

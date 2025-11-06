import mongoose from "mongoose";

const pixelSchema = new mongoose.Schema({
  pixelId: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Pixel", pixelSchema);

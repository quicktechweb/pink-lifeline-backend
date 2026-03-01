import mongoose from "mongoose";

const gtmSchema = new mongoose.Schema(
  {
    gtmId: { type: String, required: true }, // GTM ID like "GTM-XXXXXXX"
  },
  { timestamps: true }
);

export default mongoose.model("Gtm", gtmSchema);
import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true },
    status: { type: String, default: "active" },
    campaignImg: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);

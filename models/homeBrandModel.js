import mongoose from "mongoose";

const homeBrandSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
    },
    brandImg: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const HomeBrand = mongoose.model("HomeBrand", homeBrandSchema,"homebrand");
export default HomeBrand;

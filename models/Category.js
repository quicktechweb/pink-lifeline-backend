import mongoose from "mongoose";

const categorySchema = mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Inactive",
    },
     categoryImg: {
      type: String, // শুধু URL save হবে (যেমন imgbb এর লিঙ্ক)
      default: "",
    },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;


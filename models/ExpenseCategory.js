import mongoose from "mongoose";

const expenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, default: "Active" },
  },
  { timestamps: true }
);

export default mongoose.model("ExpenseCategory", expenseCategorySchema);

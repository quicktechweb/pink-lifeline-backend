import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    tradeName: { type: String },
    tradeNumber: { type: String },
    openingBalance: { type: Number, default: 0 },
    mainBalance: { type: Number, default: 0 },
    dueBalance: { type: Number, default: 0 },
    image: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    payments: [paymentSchema], // ✅ store all payment history
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);

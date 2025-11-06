import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  orderId: String,
  customerId: String,
  amount: Number,
  transectionId: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Payment", paymentSchema);

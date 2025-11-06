import mongoose from "mongoose";

const PendingPurchaseSchema = new mongoose.Schema({
  paymentID: { type: String, required: true, unique: true },
  merchantInvoiceNumber: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed }, // original payload
  idToken: { type: String }, // bKash id token
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("PendingPurchase", PendingPurchaseSchema);

import mongoose from "mongoose";

const withdrawSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserData", required: true },
    username: { type: String, required: true },
    email: { type: String },
    phoneNumber: { type: String, required: true },
    paymentNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["bKash", "Nagad", "Rocket"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
     type: { type: String, enum: ["add"], default: "add" },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    adminApprovedBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const WithdrawRequest = mongoose.model("WithdrawRequest", withdrawSchema, "withdraw_requests");

export default WithdrawRequest;

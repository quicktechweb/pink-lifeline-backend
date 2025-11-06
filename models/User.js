import mongoose from "mongoose";

const walletHistorySchema = new mongoose.Schema({
  type: { type: String, enum: ["add"], default: "add" },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});


const userDataSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, unique: true, sparse: true },
    password: { type: String },
    displayName: { type: String, required: true },
    referralCode: { type: String },
    email: { type: String, unique: true, sparse: true },
     myrefferalcode: { type: String, unique: true, sparse: true },
    status: { type: String, default: "active" },
    birthday: { type: String },        // ✅ add
    gender: { type: String },
    address: { type: String },
    newpartroles: { type: String, enum: ["user","subadmin","admin","SUPERadmin","Moderator","Support"], default:"user"},
    newpartuser: { type: String, enum: ["user"], default:"user"},
  permissions: { type: Object, default: {} },
  walletBalance: { type: Number, default: 0 },
  walletHistory: [walletHistorySchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


// MongoDB collection এর নাম হবে **userdata**
const UserData = mongoose.model("UserData", userDataSchema, "userdata");

export default UserData;

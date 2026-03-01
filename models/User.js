import mongoose from "mongoose";
import bcrypt from "bcryptjs";


const walletHistorySchema = new mongoose.Schema({
  type: { type: String, enum: ["add"], default: "add" },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const referralHistorySchema = new mongoose.Schema({
  type: { type: String, enum: ["direct", "indirect"], required: true },
  amount: { type: Number, required: true },
  referredUser: { type: String }, // optional: phone or ID of the referred user
  createdAt: { type: Date, default: Date.now }
});

const userDataSchema = new mongoose.Schema(
  {
    password: { type: String },
    displayName: { type: String, required: true },
    referralCode: { type: String },
     myrefferalcode: { type: String, unique: true, sparse: true },
    status: { type: String, default: "active" },
    birthday: { type: String },        // ✅ add
    gender: { type: String },
    address: { type: String },
    avatar: { type: String },

    // newpartroles: { type: String, enum: ["user","subadmin","admin","SUPERadmin","Moderator","Support"], default:"user"},
      newpartroles: { type: String, default: "user" },
    newpartuser: { type: String, enum: ["user"], default:"user"},
  permissions: { type: Object, default: {} },
  walletBalance: { type: Number, default: 0 },
  referralBalance: { type: Number, default: 0 },
  addBkashAmount: { type: Number, default: 0 },
   referralCount: { type: Number, default: 0 }, // Direct referral count
  badge: { type: String, default: "None" },
  walletHistory: [walletHistorySchema],
  referralHistory: [referralHistorySchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


/* 🔐 HASH PASSWORD BEFORE SAVE */
/* ✅ Compare password method (handles old plain passwords too) */
userDataSchema.methods.comparePassword = async function(enteredPassword) {
  if (!this.password) return false;

  // hashed password
  if (this.password.startsWith("$2")) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // old plain password (for migration)
  if (enteredPassword === this.password) {
    // hash it now for future
    this.password = await bcrypt.hash(enteredPassword, 12);
    await this.save();
    console.log(`Old password hashed for user ${this.phoneNumber || this.email}`);
    return true;
  }

  return false;
};

// MongoDB collection এর নাম হবে **userdata**
const UserData = mongoose.model("UserData", userDataSchema, "userdata");

export default UserData;

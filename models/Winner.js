// models/Winner.js
import mongoose from 'mongoose';

const WinnerSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  couponId: { type: String, required: true },
  username: { type: String },
  useremail: { type: String, required: true },
  userPhone: { type: String },
  userRegPhone: { type: String }, 
  productImage: { type: String },
   round: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Winner', WinnerSchema);

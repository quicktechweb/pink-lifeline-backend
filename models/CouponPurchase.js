import mongoose from 'mongoose';


const CouponPurchaseSchema = new mongoose.Schema({
couponId: { type: String, required: true, unique: false },
productId: { type: String, required: true },
productName: { type: String, required: true },
useremail: { type: String, required: false },
username: { type: String, required: false },
productImage: { type: String },
price: { type: Number, required: true },
quantity: { type: Number, required: true },
couponlimit: { type: Number, required: true },
userPhone: { type: String }, // optional: bKash phone / user identifier
userRegPhone: { type: String }, 
paymentMethod: { type: String, default: 'bkash-mock' },
 round: { type: Number, default: 1 },
metadata: { type: mongoose.Schema.Types.Mixed },
createdAt: { type: Date, default: Date.now },
status: { type: String, default: "pending" },
});


export default mongoose.model('CouponPurchase', CouponPurchaseSchema);
import mongoose from 'mongoose';

const WishlistSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productTitle: { type: String },
  productPrice: { type: Number },
  productImg: { type: String },
  productData: { type: Object },
  user: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
  },
  addedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Wishlist", WishlistSchema);

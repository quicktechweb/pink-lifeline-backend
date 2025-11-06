// models/Product.js
import mongoose from "mongoose";
import { nanoid } from "nanoid";

const reviewSchema = new mongoose.Schema({
  userAuth: String, // user email or phone
  rating: { type: Number, required: true },
   username: { type: String, default: "Anonymous" },
  comment: { type: String, required: true },
  photos: [String], // uploaded image URLs
  date: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema(
  {
    productid: {
      type: String,
      default: () => nanoid(8).toUpperCase(), // 8 characters, uppercase
      unique: true,
    },
    title: { type: String, required: true },
    categoryName: String,
    supplier: { type: String, required: true },
    subcategoryName: String,
    childcategoryName: String,
    purchasePrice: Number,
    ProductPrice: Number,
    oldPrice: Number,
    discount: String,
    rating: Number,
    sold: Number,
    shop: String,
    totalcupon: Number,
    remaining: Number,
    brandName: { type: String, default: "" },
    brandImg: { type: String, default: "" }, 
    categoryImg: { type: String, default: "" }, 
    subcategoryImg: { type: String, default: "" }, 
    childcategoryImg: { type: String, default: "" }, 
    save: String,
    type: { type: String, default: "" },           
   size: {
  type: [String],
  default: [],
},        
   color: {
      type: [String], // now it's an array
      default: [], // starts empty
    },          
    variant: { type: String, default: "" },         
    stock: { type: Number, default: 0 },
    couponPrice: { type: Number, default: 0 },
    description: { type: String, default: "" },
    metadescription: { type: String, default: "" },
    
    // changed from single string to array
    images: [String],
     imagesHash: { type: [String], default: [] },

    reviews: [reviewSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);

// models/Product.js
import mongoose from "mongoose";
import { nanoid } from "nanoid";

const reviewSchema = new mongoose.Schema({
  userAuth: String, // user email or phone
  rating: { type: Number, required: true },
   username: { type: String },
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
    userHighestBuyCoupon: Number,
    stockWarning: Number,
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
     bulletPoints: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 4;
        },
        message: "Maximum 4 bullet points allowed",
      },
    },
    // ✅ Promo fields
 // ✅ Promo fields
 // ✅ Add startDate and endDate for promo
 
promoCode: { type: String, default: null },
promoType: { type: String, default: null },
promoValue: { type: Number, default: 0 },
promoStartDate: { type: Date, default: null },
promoEndDate: { type: Date, default: null },

allProductPromoCode: { type: String, default: null },
allProductPromoType: { type: String, default: null },
allProductPromoValue: { type: Number, default: 0 },
allProductPromoStartDate: { type: Date, default: null },
allProductPromoEndDate: { type: Date, default: null },
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
    availability: { type: String, default: "" },
    metadescription: { type: String, default: "" },
    
    // changed from single string to array
    images: [String],
     imagesHash: { type: [String], default: [] },

    reviews: [reviewSchema],
    campaignId: { type: String, default: "" },
    campaignName: { type: String, default: "" },
    campaignImg: { type: String, default: "" },
   


  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);

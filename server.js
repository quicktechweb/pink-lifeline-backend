import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import subcategoryRoutes from "./routes/subcategoryRoutes.js";
import childCategoryRoute from "./routes/childCategoryRoute.js";
import productRoutes from "./routes/productRoutes.js";
import topSellingRoutes  from "./routes/topsellingRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import footerRoutes from "./routes/footer.js";
import orderRoutes from "./routes/orderRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import coupons from "./routes/coupons.js";
import expenseCategoryRoutes from "./routes/expenseCategory.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import aboutUsRoutes from "./routes/aboutUsRoutes.js";
import contactusRoutes  from "./routes/contactus.js";
import termsConditionRoutes from "./routes/termsCondition.js";
import  shippingPolicyRoutes from "./routes/shippingPolicy.js";
import faqRoutes from "./routes/faq.js";
import notificationRoutes from "./routes/notification.js";
import bkashRoutes from "./routes/bkashRoutes.js";
import pixelRoutes from "./routes/pixelRoutes.js";
import  promoSectionRoutes  from './routes/promoSection.js';
import promoCardSectionRoutes from "./routes/promoCardSection.js"
import popularCategoryRoutes from "./routes/popularCategory.js";
import categoryBannerRoutes from "./routes/categoryBannerRoutes.js";
import carouselRoutes from "./routes/carouselRoutes.js";
import homeBrandRoute from "./routes/homeBrandRoute.js";
import  bannerRoutes from "./routes/bannerRoutes.js";
import  wishlistRoutes from "./routes/wishlistRoute.js";
import  navbarCategoryRoutes from "./routes/navbarcategory.js";
import bannerAdvertisementRoute from "./routes/bannerAdvertisementRoute.js";


// dotenv.config();
// CommonJS style JSON load
import "./firebase-admin.js";

dotenv.config();
const app = express();
// app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cors());
app.use(express.json());
// MongoDB Connection
connectDB();

// Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/childcategories", childCategoryRoute);
app.use("/api/products", productRoutes);
app.use("/api/topselling", topSellingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/footer", footerRoutes);
app.use("/api", orderRoutes);
app.use("/api/brands", brandRoutes);
app.use('/api/coupons',coupons );
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/aboutus", aboutUsRoutes);
app.use("/api/contactus", contactusRoutes);
app.use("/api/termscondition", termsConditionRoutes);
app.use("/api/shippingpolicy", shippingPolicyRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/bkash", bkashRoutes);
app.use("/api", pixelRoutes);
app.use("/api/promosection", promoSectionRoutes);
app.use("/api/promocardsection", promoCardSectionRoutes);
app.use("/api/popularcategory", popularCategoryRoutes);
app.use("/api/categorybanner", categoryBannerRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/brandspart", homeBrandRoute);
app.use("/api/categoryBannersparts", bannerRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/navbarcategory", navbarCategoryRoutes);
app.use("/api/bannersadvertis", bannerAdvertisementRoute);
app.get("/envtest", (req, res) => {
  res.json({
    BKASH_BASE_URL: process.env.BKASH_BASE_URL,
    USERNAME: process.env.BKASH_CHECKOUT_URL_USER_NAME
  });
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🌍 BKASH_BASE_URL =", process.env.BKASH_BASE_URL);
});

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";

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
import  fs from "fs";
import  multer from "multer";
import campaignRoutes from "./routes/campaignRoutes.js";
import winnerRoutes from "./routes/winnerRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import adminBadgeRoutes from "./routes/adminBadge.js";
import roleRoutes from "./routes/roles.js";
import gtmRoutes from "./routes/gtmRoutes.js";


// dotenv.config();
// CommonJS style JSON load
import "./firebase-admin.js";

dotenv.config();
const app = express();
app.use(cookieParser());

// app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // React URL
    credentials: true,
  })
);
// MongoDB Connection
app.use(express.urlencoded({ extended: true }));
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
app.use("/api/campaigns", campaignRoutes);
app.use("/api/winners", winnerRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/admin/badges", adminBadgeRoutes);
app.use("/roles", roleRoutes);
app.use("/api/settings", gtmRoutes);
app.get("/envtest", (req, res) => {
  res.json({
    BKASH_BASE_URL: process.env.BKASH_BASE_URL,
    USERNAME: process.env.BKASH_CHECKOUT_URL_USER_NAME
  });
});

// const UPLOAD_DIR = "/home/luckyshop/public_html/demo";

// // ✅ Create the directory if it doesn't exist
// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
//   console.log("📁 Upload folder created at:", UPLOAD_DIR);
// } else {
//   console.log("📁 Upload folder already exists.");
// }

// app.use("/demo", express.static(UPLOAD_DIR));

// // ✅ Multer configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, UPLOAD_DIR);
//   },
//   filename: (req, file, cb) => {
//     const filename = file.originalname.replace(/\s+/g, "_");
//     cb(null, filename); 
//   },
// });

// const upload = multer({ storage });

// app.post("/upload", upload.single("image"), (req, res) => {
//   const file = req.file;

//   if (!file) {
//     return res.status(400).json({ success: false, message: "No file uploaded" });
//   }

//   const fileUrl = `https://luckyshop.com.bd/demo/${file.filename}`;
//   console.log("✅ File uploaded to:", fileUrl);
//   res.status(200).json({ success: true, url: fileUrl });
// });


const API_KEY = "820771871c5fb8b20a3ae88e8117b388"; // ⚠️ এখানে API key বসাও

// app.post("/api/fraudcheck", async (req, res) => {
//   try {
//     const { phone } = req.body;

//     if (!phone) {
//       return res.status(400).json({ status: "error", message: "Phone number is required" });
//     }

//     const API_KEY = "820771871c5fb8b20a3ae88e8117b388"; // .env এ রাখুন

//     // FormData ব্যবহার না করে JS ফরম্যাট অনুযায়ী
//     const formData = new URLSearchParams();
//     formData.append("phone", phone);

//     const response = await axios.post("https://fraudchecker.link/api/v1/qc/", formData, {
//       headers: {
//         Authorization: `Bearer ${API_KEY}`,
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//     });

//     res.json(response.data);
//   } catch (err) {
//     console.error(err.response?.data || err.message);
//     res.status(500).json({ status: "error", message: "Internal Server Error", error: err.message });
//   }
// });


app.post("/api/fraudcheck", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Phone number is required",
      });
    }

    const API_KEY = "820771871c5fb8b20a3ae88e8117b388"; // env এ রাখাই best

    const formData = new URLSearchParams();
    formData.append("phone", phone);

    const response = await axios.post(
      "https://fraudchecker.link/api/v1/qc/",
      formData.toString(),
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
      }
    );

    return res.status(200).json(response.data);

  } catch (err) {
    console.error("❌ Fraud API Error:", err.response?.data || err.message);

    return res.status(500).json({
      status: "error",
      message: err.response?.data?.message || "Fraud check failed",
    });
  }
});


const UPLOAD_DIR = "/home/luckyshop/public_html/demo";

// Create folder if missing
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve uploaded files
app.use("/demo", express.static(UPLOAD_DIR));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "_" + safeName); // unique filename
  },
});

// Only images allowed
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

// Multer setup: 1MB max size
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
});

// Upload endpoint
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded or invalid file type",
    });
  }

  const fileUrl = `https://luckyshop.com.bd/demo/${req.file.filename}`;

  res.status(200).json({
    success: true,
    message: "Image uploaded successfully",
    url: fileUrl,
  });
});

// Error handler for large files
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "আপনার ফাইল 1MB এর চেয়ে বড়। দয়া করে ছোট ফাইল আপলোড করুন।",
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
});


// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🌍 BKASH_BASE_URL =", process.env.BKASH_BASE_URL);
});

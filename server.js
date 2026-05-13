import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import doctorRoutes from "./routes/doctorRoutes/doctorRoutes.js";
import periodRoutes from "./routes/periodRoutes/periodRoutes.js"

// import adminBadgeRoutes from "./routes/adminBadge.js";
// import roleRoutes from "./routes/roles.js";
// import gtmRoutes from "./routes/gtmRoutes.js";

import dns from "dns";

import "./firebase-admin.js";


dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();
const app = express();
app.use(cookieParser());

// app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
// app.use(
//   cors({
//     origin: "http://localhost:5173", // React URL
//     credentials: true,
//   })
// );
app.use(cors());

// MongoDB Connection
app.use(express.urlencoded({ extended: true }));
connectDB();

// Routes parts

// app.use("/api/message", messageRoutes);
// app.use("/api/admin/badges", adminBadgeRoutes);
// app.use("/roles", roleRoutes);
// app.use("/api/settings", gtmRoutes);
app.use("/api/registration", doctorRoutes);
app.use("/api/period",periodRoutes)



// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🌍 BKASH_BASE_URL =", process.env.BKASH_BASE_URL);
});

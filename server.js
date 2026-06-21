import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import doctorRoutes from "./routes/doctorRoutes/doctorRoutes.js";
import periodRoutes from "./routes/periodRoutes/periodRoutes.js";
import selfTestRoutes from "./routes/selfTestRoutes/selfTestRoutes.js";
import communityRoutes from "./routes/communityRoutes/communityRoutes.js";
import degreeRoutes from "./routes/degreeRoutes/degreeRoutes.js"
import dropdownRoutes from "./routes/dropdowns/dropdownsRoutes.js"
import userRoutes from "./routes/doctorRoutes/userRoutes.js"
import dns from "dns";
import "./firebase-admin.js";
import internalUtilRoutes from "./other/supportive.js";
import { apiLogger } from "./middleware/logger.js";
import { devOnly } from "./middleware/checkEnviornment.js";
import  dashboardStatsRoutes  from "./routes/dashboardStatsRoutes/dashboardStatsRoutes.js";
import startNotificationScheduler from "./services/schedulerService.js";
import verifyToken from "./middleware/jwt.js";
import User from "./models/DoctorRegistration/DoctorRegistration.js";


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
// http://192.168.0.130:5173
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.0.112:5173",
      "http://192.168.0.130:5173",
    ],
    credentials: true,
  })
);

app.use(apiLogger);
// MongoDB Connection
app.use(express.urlencoded({ extended: true }));

if ( await connectDB()===1) {
  await startNotificationScheduler();
}else {
  process.stdout.write('\u0007');
  console.log("❌ MongoDB connection failed. Server is not running. 🔴");
}


// Routes parts

// app.use("/api/message", messageRoutes);
// app.use("/api/admin/badges", adminBadgeRoutes);
// app.use("/roles", roleRoutes);
// app.use("/api/settings", gtmRoutes);
app.use("/api/registration", doctorRoutes);
app.use("/api/period", periodRoutes);
app.use("/api/self-test", selfTestRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/degree",degreeRoutes);
app.use("/api/dropdowns",dropdownRoutes)
app.use("/api/user", userRoutes);
app.use("/api/dashboard-stats",dashboardStatsRoutes)



app.get("/api/user/me", verifyToken, async (req, res) => {
  try {
    const userDoc = await User.findOne({ userId: req.user.userId }).select("_id userId email type role").lean(); 

    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const fullUserPayload = {
      ...req.user,       
      role: userDoc.role 
    };

    return res.status(200).json({
      success: true,
      user: fullUserPayload,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});


app.use("/other",devOnly,internalUtilRoutes)











app.get("/", async (req, res) => {
  res.status(200).send(`🚀 Pink Lifeline Backend is running smoothly | STATUS: ONLINE | ⏰ ${new Date().toISOString()} | ⚡ Uptime: ${Math.floor(process.uptime())}s`);
});

// Server Start
const PORT = process.env.PORT || 5000;



app.use((err, req, res, next) => {
  console.error("ERROR =>", err);

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: err.stack || undefined,
  });
});





app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  const usedRAM = process.memoryUsage().rss / 1024 / 1024;
  console.log(`💾 RAM Used: ${usedRAM.toFixed(2)} MB`);
});

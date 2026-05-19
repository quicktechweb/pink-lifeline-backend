import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import doctorRoutes from "./routes/doctorRoutes/doctorRoutes.js";
import periodRoutes from "./routes/periodRoutes/periodRoutes.js"
import selfTestRoutes from "./routes/selfTestRoutes/selfTestRoutes.js"
import communityRoutes from "./routes/communityRoutes/communityRoutes.js"


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
app.use("/api/self-test",selfTestRoutes)
app.use("/api/community",communityRoutes)




app.get("/",async (req,res) => {
  res.send("Server is running great.")
})

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  
  console.log(`🚀 Server running on port ${PORT}`);
  const usedRAM = process.memoryUsage().rss / 1024 / 1024;
  console.log(`💾 RAM Used: ${usedRAM.toFixed(2)} MB`);

});

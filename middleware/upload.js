import multer from "multer";

// 🔥 memory storage (ImgBB / Cloud upload এর জন্য best)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (optional but good)
  },
});
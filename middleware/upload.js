  import multer from "multer";

  import { CloudinaryStorage } from "multer-storage-cloudinary";
  import cloudinary from "./../config/cloudinary.js";

  const storage = multer.memoryStorage();

  export const upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  const videoStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "self-test-videos",
      resource_type: "video",
    },
  });

  const uploadVideo = multer({
    storage: videoStorage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });
  export default uploadVideo;

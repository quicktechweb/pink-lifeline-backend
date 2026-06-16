//   import multer from "multer";

//   import { CloudinaryStorage } from "multer-storage-cloudinary";
//   import cloudinary from "./../config/cloudinary.js";

//   const storage = multer.memoryStorage();

//   export const upload = multer({
//     storage,
//     limits: {
//       fileSize: 5 * 1024 * 1024,
//     },
//   });

//   const videoStorage = new CloudinaryStorage({
//     cloudinary,
//     params: {
//       folder: "self-test-videos",
//       resource_type: "video",
//     },
//   });

//   const uploadVideo = multer({
//     storage: videoStorage,
//     limits: {
//       fileSize: 50 * 1024 * 1024, // 50MB
//     },
//   });
//   export default uploadVideo;


//   export const uploadImage = multer({
//   storage,

//   limits: {
//     fileSize: 5 * 1024 * 1024,
//   },

//   fileFilter: (req, file, cb) => {
//     const allowed = [
//       "image/jpeg",
//       "image/png",
//       "image/jpg",
//       "image/webp",
//     ];

//     if (allowed.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Invalid image type"));
//     }
//   },
// });




























// import axios from "axios";
// import FormData from "form-data";

// export const uploadToImageBB = async (file) => {
//   try {

//     /**
//      * Convert buffer -> base64
//      */
//     const base64Image = file.buffer.toString("base64");

//     /**
//      * Create form data
//      */
//     const formData = new FormData();

//     formData.append("image", base64Image);

//     /**
//      * Upload to ImageBB
//      */
//     const response = await axios.post(
//       `https://api.imgbb.com/1/upload?key=${process.env.IMAGE_BB_API_KEY}`,
//       formData,
//       {
//         headers: formData.getHeaders(),
//       }
//     );

//     /**
//      * Return image URL
//      */
//     return response.data.data.url;

//   } catch (error) {

//     console.error(
//       "IMAGE_BB_UPLOAD_ERROR:",
//       error.response?.data || error.message
//     );

//     throw new Error("Failed to upload image");
//   }
// };












import multer from "multer";



import cloudinary from "./../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";

/**
 * Memory storage for image uploads
 */
const storage = multer.memoryStorage();

/**
 * Image upload middleware
 */


    export const uploadImage = multer({
      storage,

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (req, file, cb) => {
        const allowed = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
          "application/octet-stream",
          "image/heic",
          "image/heif",
        ];

        console.log("🚀 ~ upload.js:173 ~ file.mimetype:", file.mimetype)
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid image type"));
        }

      },
    });








/**
 * Cloudinary video storage
 */
const videoStorage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "self-test-videos",
    resource_type: "video",
  },
});




/**
 * Video upload middleware
 */
const uploadVideo = multer({
  storage: videoStorage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export default uploadVideo;
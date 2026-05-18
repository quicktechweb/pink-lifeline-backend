
import express from "express";
import { createPost } from "../../controllers/Community/community.js";
import { uploadImage } from "../../middleware/upload.js";

const router = express.Router();

router.post("/v1/create-post/:userId",  uploadImage.single("photo"), createPost)

export default router;
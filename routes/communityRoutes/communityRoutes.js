
import express from "express";
import { createPost , getAllPosts, postDownVote, postUpVote } from "../../controllers/Community/community.js";
import { uploadImage } from "../../middleware/upload.js";

const router = express.Router();

router.post("/v1/create-post/:userId",  uploadImage.single("photo"), createPost)
router.get("/v1/get-all-posts", getAllPosts )
router.post("/v1/post-upvote/:userId",postUpVote)
router.post("/v1/post-downvote/:userId",postDownVote)




export default router;
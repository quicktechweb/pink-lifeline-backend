
import express from "express";
import { createPost,   getAllPosts, postComment, postDownVote,getSinglePost ,commentUpVote,commentDownVote, postUpVote, getUpvotedPosts, getDownvotedPosts, getUpvotedComments, getDownvotedComments } from "../../controllers/Community/community.js";
import { uploadImage } from "../../middleware/upload.js";

const router = express.Router();

router.post("/v1/create-post/:userId",  uploadImage.single("photo"), createPost)
router.get("/v1/get-all-posts", getAllPosts )
router.post("/v1/post-upvote/:userId",postUpVote)
router.post("/v1/post-downvote/:userId",postDownVote)
router.post("/v1/post-comment/:userId",postComment)
router.get("/v1/get-post-by-id/:postId", getSinglePost )
router.put("/v1/comment-upvote/:userId",commentUpVote)
router.put("/v1/comment-downvote/:userId",commentDownVote)


router.get("/v1/get-upvoted-posts/:userId",getUpvotedPosts  )
router.get("/v1/get-downvoted-posts/:userId", getDownvotedPosts )
router.get("/v1/get-upvoted-comments/:userId", getUpvotedComments)
router.get("/v1/get-downvoted-comments/:userId", getDownvotedComments )



export default router;
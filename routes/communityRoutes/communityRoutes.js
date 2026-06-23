import express from "express";
import { createPost, getAllPosts, getSearchedResults, postComment, getAllUserPosts, postDownVote, getSinglePost, commentUpVote, commentDownVote, postUpVote, getUpvotedPosts, getDownvotedPosts, getUpvotedComments, getDownvotedComments, savePost, getAllSavedPosts, deletePost, getAllUserComments, getAllPostsByAdmin, getAllUserPosts2 } from "../../controllers/Community/community.js";
import { uploadImage } from "../../middleware/upload.js";
import { isUserExist } from "../../middleware/isUserExist.js";

const router = express.Router();

router.post("/v1/create-post/:userId", uploadImage.single("photo"), createPost);
router.post("/v1/post-upvote/:userId", postUpVote);
router.post("/v1/post-downvote/:userId", postDownVote);

router.post("/v1/post-comment/:userId", postComment);

router.put("/v1/comment-upvote/:userId", commentUpVote);
router.put("/v1/comment-downvote/:userId", commentDownVote);

router.get("/v1/get-all-posts/:userId", getAllPosts);

router.get("/v1/get-post-by-id/:userId", getSinglePost);
router.post("/v1/get-post-by-id/:userId", getSinglePost);

router.get("/v1/get-upvoted-posts/:userId", getUpvotedPosts);
router.get("/v1/get-downvoted-posts/:userId", getDownvotedPosts);
router.get("/v1/get-upvoted-comments/:userId", getUpvotedComments);
router.get("/v1/get-downvoted-comments/:userId", getDownvotedComments);

router.get("/v1/get-all-saved-posts/:userId", isUserExist, getAllSavedPosts);


router.get("/v1/get-user-posts/:userId", isUserExist, getAllUserPosts);
router.get("/v2/get-user-posts/:userId", isUserExist, getAllUserPosts2);


router.get("/v1/search-posts/:query", getSearchedResults);

router.post("/v1/save-post/:userId", isUserExist, savePost);
router.delete("/v1/delete-post/:userId/:postId", isUserExist, deletePost);
router.get("/v1/get-user-comments/:userId", isUserExist, getAllUserComments);

router.get("/v1/get-all-posts-admin", getAllPostsByAdmin);


export default router;

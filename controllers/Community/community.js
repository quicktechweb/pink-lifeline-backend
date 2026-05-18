import mongoose from "mongoose";
import { uploadToImageBB } from "../../config/uploadToImageBB.js";
import { Post } from "../../models/Community/PostModel.js";
import { badRequestResponse, notFoundResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";
import User from "./../../models/DoctorRegistration/DoctorRegistration.js";
import { Vote } from "../../models/Community/VoteModel.js";

export const createPost = async (req, res) => {
  try {
    const userId = req.params.userId;

    const { title, description, hashtags = [] } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      notFoundResponse(res, "User not found", "User not found.");
    }

    /**
     * Upload image to imagebb
     */
    let uploadedPhoto = null;

    if (req.file) {
      uploadedPhoto = await uploadToImageBB(req.file);
    }

    /**
     * Create post
     */
    const newPost = await Post.create({
      name: isUserExist.fullName,
      userId,
      title,
      description,
      hashtags: hashtags || [],
      isVerified: isUserExist.isDoctor == 1 ? true : false,
      photo: uploadedPhoto,
    });

    /**
     * Response
     */

    successResponse(res, newPost, "Post created successfully.", "Post created successfully");
  } catch (error) {
    console.error("CREATE_POST_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const allPosts = await Post.aggregate([
      {
        $addFields: {
          netvote: {
            $subtract: ["$upvote", "$downvote"],
          },
        },
      },

      {
        $sort: {
          createdAt: -1,
          netvote: -1,
        },
      },
    ]);

    if (allPosts) {
      successResponse(res, allPosts, "All post is fetched", "All posts is fetched.");
    } else {
      notFoundResponse(res, "Not Found", "Not found data.");
    }
  } catch (error) {
    console.error("GET_ALL_POSTS_ERROR:", error);

    somethingWentWrong(res, null, "Unable to fetch the data.", "Unable to fetch the data.");
  }
};

export const postUpVote = async (req, res) => {
  const userId = req.params.userId;
  const { postId } = req.body;

  try {
    if (!userId) {
      return badRequestResponse(res, "Invalid User.", "Invalid user.");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User is not registered.", "user is not register.");
    }

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return badRequestResponse(res, "Invalid postId.", "Invalid postId.");
    }

    const post = await Post.findById(postId);

    if (!post) {
      return notFoundResponse(res, "Post not found.", "post not found.");
    }

    // 🔥 check existing vote
    const existingVote = await Vote.findOne({ userId, postId });

    // CASE 1: no vote yet → create upvote
    if (!existingVote) {
      await Vote.create({
        userId,
        postId,
        type: "upvote",
      });

      post.upvote += 1;
      await post.save();

      return successResponse(res, post, "Upvoted successfully", "post upvoted");
    }

    // CASE 2: already upvoted → remove upvote
    if (existingVote.type === "upvote") {
      await Vote.deleteOne({ _id: existingVote._id });

      post.upvote -= 1;
      await post.save();

      return successResponse(res, post, "Upvote removed", "upvote removed");
    }

    // CASE 3: previously downvoted → switch to upvote
    if (existingVote.type === "downvote") {
      existingVote.type = "upvote";
      await existingVote.save();

      post.downvote -= 1;
      post.upvote += 1;
      await post.save();

      return successResponse(res, post, "Switched to upvote", "switch vote to upvote");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const postDownVote = async (req, res) => {
  const userId = req.params.userId;
  const { postId } = req.body;

  try {
    if (!userId) {
      return badRequestResponse(res, "Invalid User.", "Invalid user.");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User is not registered.", "user is not register.");
    }

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return badRequestResponse(res, "Invalid postId.", "Invalid postId.");
    }

    const post = await Post.findById(postId);

    if (!post) {
      return notFoundResponse(res, "Post not found.", "post not found.");
    }

    // 🔥 check existing vote
    const existingVote = await Vote.findOne({ userId, postId });

    // CASE 1: no vote → create downvote
    if (!existingVote) {
      await Vote.create({
        userId,
        postId,
        type: "downvote",
      });

      post.downvote += 1;
      await post.save();

      return successResponse(res, post, "Downvoted successfully", "post downvoted");
    }

    // CASE 2: already downvoted → remove downvote
    if (existingVote.type === "downvote") {
      await Vote.deleteOne({ _id: existingVote._id });

      post.downvote -= 1;
      await post.save();

      return successResponse(res, post, "Downvote removed", "downvote removed");
    }

    // CASE 3: previously upvoted → switch to downvote
    if (existingVote.type === "upvote") {
      existingVote.type = "downvote";
      await existingVote.save();

      post.upvote -= 1;
      post.downvote += 1;
      await post.save();

      return successResponse(res, post, "Switched to downvote", "switch vote to downvote");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

import mongoose from "mongoose";
import { uploadToImageBB } from "../../config/uploadToImageBB.js";
import { Post } from "../../models/Community/PostModel.js";
import { badRequestResponse, notFoundResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";
import User from "./../../models/DoctorRegistration/DoctorRegistration.js";
import { Vote } from "../../models/Community/VoteModel.js";
import { Comment } from "../../models/Community/CommentModel.js";
import SavedPostModel from "../../models/Community/SavedPostModel.js";

export const createPost = async (req, res) => {
  try {
    const userId = req.params.userId;

    const { title, description, hashtags = [] | "" } = req.body;


    let normalizedHashtags 



    
if (Array.isArray(hashtags)) {
  normalizedHashtags = hashtags
    .map((tag) => String(tag).trim())
    .filter((tag) => /^[a-zA-Z]+$/.test(tag))
    .map((tag) => `#${tag}`);

} else if (typeof hashtags === "string") {
  try {
    const parsed = JSON.parse(hashtags);

    if (Array.isArray(parsed)) {
      normalizedHashtags = parsed
        .map((tag) => String(tag).trim())
        .filter((tag) => /^[a-zA-Z]+$/.test(tag))
        .map((tag) => `#${tag}`);
    }
  } catch {
    normalizedHashtags = hashtags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => /^[a-zA-Z]+$/.test(tag))
      .map((tag) => `#${tag}`);
  }
}




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
    const updatedData = {
      name: isUserExist.fullName,
      userId,
      title,
      type: isUserExist.type,
      description,
      hashtags: normalizedHashtags,
      isVerified: isUserExist.type == 1 && isUserExist.isVerified == true ? true : false,
      photo: uploadedPhoto,
    };
    console.log("🚀 ~ community.js:52 ~ createPost ~ updatedData:", updatedData);
    const newPost = await Post.create(updatedData);

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
    const { userId } = req.params;

    if (!userId) {
      return badRequestResponse(res, "Invalid userId.", "Invalid userId.");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User not found.");
    }

    const allPosts = await Post.aggregate([
      {
        $addFields: {
          netvote: {
            $subtract: ["$upvote", "$downvote"],
          },
        },
      },

      // =====================================================
      // SORT
      // =====================================================

      {
        $sort: {
          createdAt: -1,
          netvote: -1,
        },
      },

      // =====================================================
      // USER VOTE LOOKUP
      // =====================================================

      {
        $lookup: {
          from: "votes",
          let: {
            postId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$postId", "$$postId"],
                    },
                    {
                      $eq: ["$userId", userId],
                    },
                  ],
                },
              },
            },
          ],
          as: "userVote",
        },
      },

      // =====================================================
      // SAVED POST LOOKUP
      // =====================================================

      {
        $lookup: {
          from: "savedposts",
          let: {
            postId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$postId", "$$postId"],
                    },
                    {
                      $eq: ["$userId", userId],
                    },
                  ],
                },
              },
            },
          ],
          as: "savedPost",
        },
      },

      // =====================================================
      // FLAGS
      // =====================================================

      {
        $addFields: {
          isUpvotedByUser: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$userVote",
                        as: "vote",
                        cond: {
                          $eq: ["$$vote.type", "upvote"],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              true,
              false,
            ],
          },

          isDownvotedByUser: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$userVote",
                        as: "vote",
                        cond: {
                          $eq: ["$$vote.type", "downvote"],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              true,
              false,
            ],
          },

          // =================================================
          // CHECK SAVED POST
          // =================================================

          isSavedByUser: {
            $cond: [
              {
                $gt: [
                  {
                    $size: "$savedPost",
                  },
                  0,
                ],
              },
              true,
              false,
            ],
          },
        },
      },

      // =====================================================
      // CLEANUP
      // =====================================================

      {
        $project: {
          userVote: 0,
          savedPost: 0,
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
        isUpvotedByUser: true,
        isDownvotedByUser: false,
      });

      if (post.userId.toString() === userId.toString()) {
        post.isUpvotedByUser = true;
        post.isDownvotedByUser = false;
      }

      post.upvote += 1;
      await post.save();

      return successResponse(res, post, "Upvoted successfully", "post upvoted");
    }

    // CASE 2: already upvoted → remove upvote
    if (existingVote.type === "upvote") {
      await Vote.deleteOne({ _id: existingVote._id });

      if (post.userId.toString() === userId.toString()) {
        post.isUpvotedByUser = false;
        post.isDownvotedByUser = false;
      }

      post.upvote -= 1;
      await post.save();

      return successResponse(res, post, "Upvote removed", "upvote removed");
    }

    // CASE 3: previously downvoted → switch to upvote
    if (existingVote.type === "downvote") {
      existingVote.type = "upvote";
      await existingVote.save();

      if (post.userId.toString() === userId.toString()) {
        post.isUpvotedByUser = true;
        post.isDownvotedByUser = false;
      }

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
        isUpvotedByUser: false,
        isDownvotedByUser: true,
      });
      if (post.userId.toString() === userId.toString()) {
        post.isUpvotedByUser = false;
        post.isDownvotedByUser = true;
      }

      post.downvote += 1;
      await post.save();

      return successResponse(res, post, "Downvoted successfully", "post downvoted");
    }

    // CASE 2: already downvoted → remove downvote
    if (existingVote.type === "downvote") {
      await Vote.deleteOne({ _id: existingVote._id });
      if (post.userId.toString() === userId.toString()) {
        post.isUpvotedByUser = false;
        post.isDownvotedByUser = false;
      }
      post.downvote -= 1;
      await post.save();

      return successResponse(res, post, "Downvote removed", "downvote removed");
    }

    // CASE 3: previously upvoted → switch to downvote
    if (existingVote.type === "upvote") {
      existingVote.type = "downvote";
      await existingVote.save();
      if (post.userId.toString() === userId.toString()) {
        post.isUpvotedByUser = false;
        post.isDownvotedByUser = true;
      }
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

export const postComment = async (req, res) => {
  const userId = req.params.userId;

  const { text, postId, parentId = null } = req.body;

  try {
    if (!userId) {
      return badRequestResponse(res, "Invalid User.", "Invalid user.");
    }

    if (!text || text.trim() === "") {
      return badRequestResponse(res, "Invalid Comment.", "Invalid Comment.");
    }

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return badRequestResponse(res, "Invalid postId.", "Invalid postId.");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User is not registered.", "User is not registered.");
    }

    const post = await Post.findById(postId);

    if (!post) {
      return notFoundResponse(res, "Post not found.", "Post not found.");
    }

    let parentComment = null;

    if (parentId) {
      // validate parentId
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return badRequestResponse(res, "Invalid parent comment id.", "Invalid parent comment id.");
      }

      parentComment = await Comment.findById(parentId);

      if (!parentComment) {
        return notFoundResponse(res, "Parent comment not found.", "Parent comment not found.");
      }

      if (parentComment.postId.toString() !== postId) {
        return badRequestResponse(res, "Reply mismatch.", "Reply post mismatch.");
      }
    }

    const userComment = {
      name: isUserExist.fullName,
      profilePhoto: isUserExist.profilePhoto || null,

      userId,
      postId,

      text: text.trim(),

      parentId: parentId || null,
    };

    const uploadedComment = await Comment.create(userComment);
    post.totalComments += 1;
    await post.save();

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentId, {
        $inc: {
          totalReplies: 1,
        },
      });
    }

    if (uploadedComment) {
      return successResponse(res, uploadedComment, parentId ? "Reply added successfully." : "Comment added successfully.", parentId ? "Reply published successfully." : "Comment published successfully.");
    }

    return badRequestResponse(res, "Unable to comment.", "Comment publish failed.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Unable to comment.", "Unable to comment.");
  }
};

export const getSinglePost = async (req, res) => {
  const { userId } = req.params;
  const { postId } = req.body;

  try {
    // =========================
    // VALIDATE POST ID
    // =========================

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return badRequestResponse(res, "Invalid post id.", "Invalid post id.");
    }

    // =========================
    // FETCH POST
    // =========================

    const post = await Post.findById(postId);

    const userVote = await Vote.findOne({ userId, postId });

    if (!post) {
      return notFoundResponse(res, "Post not found.", "Post not found.");
    }

    if (userVote) {
      if (userVote.type === "upvote") {
        post.isUpvotedByUser = true;
      } else if (userVote.type === "downvote") {
        post.isDownvotedByUser = true;
      }
    }

    // =========================
    // FETCH ALL COMMENTS
    // =========================

    const comments = await Comment.find({
      postId,
    }).sort({
      createdAt: 1,
    });

    // =========================
    // BUILD COMMENT TREE
    // =========================

    const commentMap = {};

    // create map
    comments.forEach((comment) => {
      commentMap[comment._id] = {
        ...comment.toObject(),
        replies: [],
      };
    });

    const rootComments = [];

    comments.forEach((comment) => {
      // ROOT COMMENT
      if (!comment.parentId) {
        rootComments.push(commentMap[comment._id]);
      }

      // REPLY
      else {
        const parent = commentMap[comment.parentId.toString()];

        if (parent) {
          parent.replies.push(commentMap[comment._id]);
        }
      }
    });

    // =========================
    // RESPONSE
    // =========================

    return successResponse(
      res,
      {
        post,
        comments: rootComments,
      },
      "Post fetched successfully.",
      "Post fetched successfully.",
    );
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Unable to fetch post.", "Unable to fetch post.");
  }
};

export const commentDownVote = async (req, res) => {
  const userId = req.params.userId;
  const { commentId } = req.body;

  try {
    if (!userId) {
      return badRequestResponse(res, "Invalid User.", "Invalid user.");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User is not registered.", "user is not registered.");
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return badRequestResponse(res, "Invalid commentId.", "Invalid commentId.");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return notFoundResponse(res, "Comment not found.", "comment not found.");
    }

    // 🔥 check existing vote
    const existingVote = await Vote.findOne({
      userId,
      commentId,
    });

    // CASE 1: no vote → create downvote
    if (!existingVote) {
      await Vote.create({
        userId,
        commentId,
        type: "downvote",
        isDownvotedByUser: true,
      });

      comment.downvote += 1;
      comment.isDownvotedByUser = true;
      await comment.save();

      return successResponse(res, comment, "Comment downvoted successfully", "comment downvoted");
    }

    // CASE 2: already downvoted → remove downvote
    if (existingVote.type === "downvote") {
      await Vote.deleteOne({
        _id: existingVote._id,
      });

      comment.downvote -= 1;
      comment.isDownvotedByUser = false;
      await comment.save();

      return successResponse(res, comment, "Comment downvote removed", "comment downvote removed");
    }

    // CASE 3: previously upvoted → switch to downvote
    if (existingVote.type === "upvote") {
      existingVote.type = "downvote";
      existingVote.isUpvotedByUser = false;
      existingVote.isDownvotedByUser = true;
      await existingVote.save();

      comment.upvote -= 1;
      comment.downvote += 1;
      comment.isDownvotedByUser = true;
      await comment.save();

      return successResponse(res, comment, "Switched to comment downvote", "switch comment vote to downvote");
    }
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const commentUpVote = async (req, res) => {
  const userId = req.params.userId;
  const { commentId } = req.body;

  try {
    if (!userId) {
      return badRequestResponse(res, "Invalid User.", "Invalid user.");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User is not registered.", "user is not registered.");
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return badRequestResponse(res, "Invalid commentId.", "Invalid commentId.");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return notFoundResponse(res, "Comment not found.", "comment not found.");
    }

    // 🔥 check existing vote
    const existingVote = await Vote.findOne({
      userId,
      commentId,
    });

    // CASE 1: no vote → create upvote
    if (!existingVote) {
      await Vote.create({
        userId,
        commentId,
        type: "upvote",
        isUpvotedByUser: true,
      });

      comment.upvote += 1;
      comment.isUpvotedByUser = true;

      await comment.save();

      return successResponse(res, comment, "Comment upvoted successfully", "comment upvoted");
    }

    // CASE 2: already upvoted → remove upvote
    if (existingVote.type === "upvote") {
      await Vote.deleteOne({
        _id: existingVote._id,
      });

      comment.upvote -= 1;
      comment.isUpvotedByUser = false;
      await comment.save();

      return successResponse(res, comment, "Comment upvote removed", "comment upvote removed");
    }

    // CASE 3: previously downvoted → switch to upvote
    if (existingVote.type === "downvote") {
      existingVote.type = "upvote";
      existingVote.isUpvotedByUser = true;
      existingVote.isDownvotedByUser = false;
      await existingVote.save();

      comment.downvote -= 1;
      comment.upvote += 1;
      comment.isUpvotedByUser = true;
      await comment.save();

      return successResponse(res, comment, "Switched to comment upvote", "switch comment vote to upvote");
    }
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUpvotedPosts = async (req, res) => {
  const userId = req.params.userId;
  const posts = await Vote.find({ userId, type: "upvote", postId: { $exists: true } }).populate("postId");
  successResponse(res, posts, "Upvoted posts fetched successfully.", "Upvoted posts fetched successfully.");
};

export const getDownvotedPosts = async (req, res) => {
  const userId = req.params.userId;
  const posts = await Vote.find({ userId, type: "downvote", postId: { $exists: true } }).populate("postId");
  successResponse(res, posts, "Downvoted posts fetched successfully.", "Downvoted posts fetched successfully.");
};

export const getUpvotedComments = async (req, res) => {
  const userId = req.params.userId;
  const comments = await Vote.find({ userId, type: "upvote", commentId: { $exists: true } }).populate("commentId");
  successResponse(res, comments, "Upvoted comments fetched successfully.", "Upvoted comments fetched successfully.");
};

export const getDownvotedComments = async (req, res) => {
  const userId = req.params.userId;
  const comments = await Vote.find({ userId, type: "downvote", commentId: { $exists: true } }).populate("commentId");
  successResponse(res, comments, "Downvoted comments fetched successfully.", "Downvoted comments fetched successfully.");
};

export const savePost = async (req, res) => {
  const userId = req.params.userId;
  const { postId } = req.body;

  try {
    if (!userId) {
      return badRequestResponse(res, "User ID is required.", "User ID is missing.");
    }

    if (!postId) {
      return badRequestResponse(res, "Post ID is required.", "Post ID is missing.");
    }

    const isPostExist = await Post.findById(postId);
    if (isPostExist.userId.toString() === userId.toString()) {
      isPostExist.isSavedByUser = !isPostExist.isSavedByUser;

      const saveUserOwnPost = await isPostExist.save();
    }

    if (!isPostExist) {
      return notFoundResponse(res, "Post not found.", "Requested post does not exist.");
    }

    const existingSavedPost = await SavedPostModel.findOne({
      userId,
      postId,
    });

    if (existingSavedPost) {
      await SavedPostModel.findByIdAndDelete(existingSavedPost._id);

      return successResponse(res, null, "Post unsaved successfully.", "Successfully removed saved post.");
    }

    const savedPost = await SavedPostModel.create({
      userId,
      postId,
      postOwnerId: isPostExist.userId || null,
      savedAt: new Date(),
    });

    return successResponse(res, savedPost, "Post saved successfully.", "Successfully saved post.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to save/unsave post.", "Save post operation failed.");
  }
};

export const getAllSavedPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return badRequestResponse(res, "Invalid userId.", "Invalid userId.");
    }

    const isUserExist = await User.findOne({ userId });

    if (!isUserExist) {
      return notFoundResponse(res, "User not found.", "User not found.");
    }

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

      {
        $lookup: {
          from: "votes",
          let: {
            postId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$postId", "$$postId"],
                    },
                    {
                      $eq: ["$userId", userId],
                    },
                  ],
                },
              },
            },
          ],
          as: "userVote",
        },
      },

      {
        $lookup: {
          from: "savedposts",
          let: {
            postId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$postId", "$$postId"],
                    },
                    {
                      $eq: ["$userId", userId],
                    },
                  ],
                },
              },
            },
          ],
          as: "savedPostData",
        },
      },

      {
        $match: {
          "savedPostData.0": {
            $exists: true,
          },
        },
      },

      {
        $addFields: {
          isUpvotedByUser: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$userVote",
                        as: "vote",
                        cond: {
                          $eq: ["$$vote.type", "upvote"],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              true,
              false,
            ],
          },

          isDownvotedByUser: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$userVote",
                        as: "vote",
                        cond: {
                          $eq: ["$$vote.type", "downvote"],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              true,
              false,
            ],
          },

          isSavedByUser: {
            $cond: [
              {
                $gt: [
                  {
                    $size: "$savedPostData",
                  },
                  0,
                ],
              },
              true,
              false,
            ],
          },
        },
      },

      {
        $project: {
          userVote: 0,
          savedPostData: 0,
        },
      },
    ]);

    if (allPosts) {
      successResponse(res, allPosts, "All saved posts are fetched", "All saved posts are fetched.");
    } else {
      notFoundResponse(res, "Not Found", "Not found data.");
    }
  } catch (error) {
    console.error("GET_ALL_POSTS_ERROR:", error);

    somethingWentWrong(res, null, "Unable to fetch the saved data.", "Unable to fetch the saved data.");
  }
};

export const getAllUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return badRequestResponse(res, "Invalid userId.", "Invalid userId.");
    }

    const allUserPosts = await Post.find({ userId: userId });

    if (allUserPosts.length === 0) {
      return notFoundResponse(res, "No posts found.", "No posts found for the specified user.");
    }

    return successResponse(res, allUserPosts, "All user posts are fetched", "All user posts are fetched.");
  } catch (error) {
    console.error("GET_ALL_USER_POSTS_ERROR:", error);

    somethingWentWrong(res, null, "Unable to fetch the user posts.", "Unable to fetch the user posts.");
  }
};

export const deletePost = async (req, res) => {
  const { userId, postId } = req.params;

  try {
    if (!postId) {
      return badRequestResponse(res, "Post not found.", "Post id is missing.");
    }

    const post = await Post.findById(postId);

    if (!post) {
      return notFoundResponse(res, "Post not found.", `No post found with id: ${postId}`);
    }

    if (String(post.userId) !== String(userId)) {
      return badRequestResponse(res, "Unauthorized action.", `User ${userId} does not own post ${postId}`);
    }

    const deletedPost = await Post.findByIdAndDelete(postId);

    return successResponse(res, deletedPost, "Post deleted successfully.", `Deleted post id: ${postId}`);
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Failed to delete post.", "Delete post error");
  }
};

export const getSearchedResults = async (req, res) => {
  const { query } = req.params;

  try {
    if (!query || query.trim() === "") {
      return res.send([]);
    }

    const searchTerm = query.trim();

    const posts = await Post.find({
      $or: [
        {
          title: {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          description: {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          hashtags: {
            $regex: searchTerm,
            $options: "i",
          },
        },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, posts, "Search results fetched successfully.", "Search successful");
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Failed to search posts.", "Search posts error");
  }
};

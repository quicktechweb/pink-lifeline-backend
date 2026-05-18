import { uploadToImageBB } from "../../config/uploadToImageBB.js";
import { Post } from "../../models/Community/PostModel.js";
import { notFoundResponse, successResponse } from "../../utils/utils.js";
import User from "./../../models/DoctorRegistration/DoctorRegistration.js";

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

    successResponse(res,newPost,"Post created successfully.","Post created successfully")

  } catch (error) {
    console.error("CREATE_POST_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

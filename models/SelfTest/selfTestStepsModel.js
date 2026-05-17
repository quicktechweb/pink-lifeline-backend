import mongoose from "mongoose";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";

const selfTestStepSchema = new mongoose.Schema(
  {
    stepNo: {
      type: Number,
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
    },

    videoURL: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const SelfTestStep = mongoose.model("SelfTestStep", selfTestStepSchema);

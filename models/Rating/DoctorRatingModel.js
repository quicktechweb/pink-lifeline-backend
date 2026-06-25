  import mongoose from "mongoose";

  const ratingSchema = new mongoose.Schema(
    {
      doctorUserId: {
        type: String,
        required: true,
        index: true,
      },

      appointmentId: {
        type: String,
        required: true,
        index: true,
      },

      userId: {
        type: String,
        required: true,
        index: true,
      },

      doctorName: {
        type: String,
        trim: true,
      },

      userName: {
        type: String,
        trim: true,
      },

      doctorProfilePhoto: {
        type: String,
        default: "",
      },

      userProfilePhoto: {
        type: String,
        default: "",
      },

      doctorLocation: {
        type: String,
        default: "",
      },

      hospitalName: {
        type: String,
        default: "",
      },

      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },

      review: {
        type: String,
        default: "",
      },

      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    {
      versionKey: false,
      timestamps: true,
    }
  );

  // Prevent the same user from rating the same doctor multiple times
  // ratingSchema.index({ doctorUserId: 1, userId: 1 }, { unique: true });

  export default mongoose.model("Rating", ratingSchema);
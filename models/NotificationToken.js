// models/NotificationToken.js
import mongoose from "mongoose";

const notificationTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
});

export default mongoose.model("NotificationToken", notificationTokenSchema);

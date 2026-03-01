import mongoose from "mongoose";

const badgeLevelSchema = new mongoose.Schema({
  name: { type: String, required: true },       // Badge name: Silver, Gold, Diamond
  minCount: { type: Number, required: true },   // Referral count min
  maxCount: { type: Number, required: true },   // Referral count max
});

const BadgeLevel = mongoose.model("BadgeLevel", badgeLevelSchema, "badgelevels");

export default BadgeLevel;

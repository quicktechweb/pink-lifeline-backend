import mongoose from "mongoose";

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["email", "sms"], required: true },
  subject: { type: String }, 
  body: { type: String, required: true }, // dynamic text -> {{name}}, {{amount}}
}, { timestamps: true });

export default mongoose.model("Template", templateSchema);

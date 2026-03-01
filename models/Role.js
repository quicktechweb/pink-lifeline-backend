import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  permissions: { type: Object, default: {} } // <-- SuperAdmin permissions structure
}, { timestamps: true });

export default mongoose.model("Role", roleSchema);

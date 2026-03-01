import express from "express";
import Role from "../models/Role.js";

const router = express.Router();

// Get all roles
router.get("/", async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.status(200).json({ success: true, roles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create new role
router.post("/", async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = new Role({ name, description, permissions });
    await role.save();
    res.status(201).json({ success: true, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update role (including permissions)
router.put("/:id", async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description, permissions },
      { new: true }
    );
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    res.status(200).json({ success: true, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete role
router.delete("/:id", async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    res.status(200).json({ success: true, message: "Role deleted", role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;

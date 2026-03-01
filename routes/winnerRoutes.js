import express from "express";
import Winner from "../models/Winner.js";

const router = express.Router();

// GET all winners
router.get("/", async (req, res) => {
  try {
    const winners = await Winner.find().sort({ createdAt: -1 }); // latest first
    res.json({ success: true, winners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch winners" });
  }
});

// PATCH: update winner status
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const valid = ["pending", "approved", "hold", "cancelled"];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const winner = await Winner.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!winner)
    return res.status(404).json({ success: false, message: "Winner not found" });

  res.json({ success: true, winner });
});


export default router;

import express from "express";
const router = express.Router();
import Wishlist from "../models/Wishlist.js";

// ✅ Add item to wishlist
router.post("/", async (req, res) => {
  try {
    const { productId, productTitle, productPrice, productImg, productData, user } = req.body;

    if (!user || (!user.email && !user.phone)) {
      return res.status(400).json({ message: "User info missing (email or phone required)" });
    }

    // ✅ Check existing wishlist item
    let existing = await Wishlist.findOne({
      productId,
      $or: [
        { "user.email": user.email || null },
        { "user.phone": user.phone || null },
      ],
    });

    if (existing) {
      // If already exists, toggle like to 1
      existing.like = 1;
      await existing.save();
      return res.status(200).json({ message: "Already in wishlist, like updated", wishlist: existing });
    }

    // Create new wishlist item with like:1
    const newItem = new Wishlist({
      productId,
      productTitle,
      productPrice,
      productImg,
      productData,
      user,
      like: 1,
    });

    await newItem.save();
    res.status(201).json({ message: "Wishlist item added", wishlist: newItem });

  } catch (err) {
    console.error("Add Wishlist Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Get wishlist by email OR phone
router.get("/", async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone required" });
    }

    const query = {
      $or: [
        ...(email ? [{ "user.email": email }] : []),
        ...(phone ? [{ "user.phone": phone }] : []),
      ],
    };

    const items = await Wishlist.find(query).sort({ addedAt: -1 });
    res.status(200).json(items);
  } catch (err) {
    console.error("Get Wishlist Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ❌ REMOVE item from wishlist
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removed = await Wishlist.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: "Item not found" });

    res.status(200).json({ message: "Wishlist item deleted", removed });
  } catch (err) {
    console.error("Delete Wishlist Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});




export default router;
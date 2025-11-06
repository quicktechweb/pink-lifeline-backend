import express from "express";
import UserData from "../models/User.js";
import WithdrawRequest from "../models/WithdrawRequest.js";

const router = express.Router();

// -------------------- Add Funds --------------------
// ---------------- Add Funds ----------------
router.post("/add", async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    const user = await UserData.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.walletBalance = (user.walletBalance || 0) + parseFloat(amount);

    // Save to walletHistory
    if (!user.walletHistory) user.walletHistory = [];
    user.walletHistory.push({
      amount: parseFloat(amount),
      type: "add",
      createdAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: `Wallet credited with $${amount}`,
      walletBalance: user.walletBalance,
      history: user.walletHistory
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Get Add Funds History ----------------
router.get("/add-history/:userId", async (req, res) => {
  try {
    const user = await UserData.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, history: user.walletHistory || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});




// -------------------- Withdraw Request --------------------
router.post("/withdraw-request", async (req, res) => {
  const { userId, amount, method, paymentNumber } = req.body;

  if (!userId || !amount || isNaN(amount) || amount <= 0 || !method || !paymentNumber) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    const user = await UserData.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    // ✅ Deduct wallet immediately (optional) or after admin approval
    user.walletBalance -= amount;
    await user.save();

    // ✅ Create withdraw request in WithdrawRequest collection
    const request = new WithdrawRequest({
      userId: user._id,
      username: user.displayName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      paymentNumber,
      amount,
      method,
      status: "pending",
    });

    await request.save();

    res.json({ success: true, message: "Withdraw request submitted", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// -------------------- Admin Approve Withdraw --------------------
router.post("/withdraw-approve/:id", async (req, res) => {
  const { adminName } = req.body;

  try {
    const request = await WithdrawRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ success: false, message: "Request already processed" });

    const user = await UserData.findById(request.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if ((user.walletBalance || 0) < request.amount) {
      request.status = "rejected";
      await request.save();
      return res.status(400).json({ success: false, message: "Insufficient balance. Request rejected." });
    }

    user.walletBalance -= request.amount;
    await user.save();

    request.status = "approved";
    request.adminApprovedBy = adminName || "Admin";
    await request.save();

    res.json({ success: true, message: "Withdraw approved", request, walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------- Admin Reject Withdraw --------------------
router.post("/withdraw-reject/:id", async (req, res) => {
  try {
    const request = await WithdrawRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ success: false, message: "Request already processed" });

    request.status = "rejected";
    await request.save();

    res.json({ success: true, message: "Withdraw request rejected", request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------- Get User Withdraw Requests --------------------
router.get("/my-requests/:userId", async (req, res) => {
  try {
    const requests = await WithdrawRequest.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// -------------------- Get All Withdraw Requests (Admin) --------------------
router.get("/all-requests", async (req, res) => {
  try {
    const requests = await WithdrawRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
import UserData from "../models/User.js";
import WithdrawRequest from "../models/WithdrawRequest.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();



// -------------------- Withdraw Request mobile--------------------
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

router.post("/withdraw-requestdata", async (req, res) => {
  const { userId, amount, method, paymentNumber } = req.body;

  if (!userId || !amount || isNaN(amount) || amount <= 0 || !method || !paymentNumber) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    const user = await UserData.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ✅ Just check if the user has enough addBkashAmount
    if ((user.addBkashAmount || 0) < amount) {
      return res.status(400).json({ success: false, message: "Insufficient addBkashAmount" });
    }

    // Create withdraw request but DO NOT deduct anything yet
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
// -------------------- Admin Approve Withdraw --------------------
router.get("/withdraw-summary", async (req, res) => {
  try {
    const summary = await WithdrawRequest.aggregate([
      {
        $group: {
          _id: "$userId",
          username: { $first: "$username" },
          email: { $first: "$email" },
          phoneNumber: { $first: "$phoneNumber" },
          totalRequested: { $sum: "$amount" },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] } },
          requests: { $push: { _id: "$_id", amount: "$amount", status: "$status", createdAt: "$createdAt", method: "$method", paymentNumber: "$paymentNumber" } }
        }
      },
      { $sort: { totalRequested: -1 } }
    ]);

    res.json({ success: true, data: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- Admin Approve Withdraw --------------------
// -------------------- Admin Approve Withdraw --------------------
router.post("/withdraw-approve/:id", async (req, res) => {
  const { adminName } = req.body;

  try {
    const request = await WithdrawRequest.findById(req.params.id);
    if (!request)
      return res.status(404).json({ success: false, message: "Request not found" });

    if (request.status !== "pending")
      return res
        .status(400)
        .json({ success: false, message: "Request already processed" });

    const user = await UserData.findById(request.userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Check if each balance is enough to deduct the requested amount
    if ((user.walletBalance || 0) < request.amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient walletBalance for this request",
      });
    }

    if ((user.addBkashAmount || 0) < request.amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient addBkashAmount for this request",
      });
    }

    // Deduct requested amount from both balances
    user.walletBalance -= request.amount;
    user.addBkashAmount -= request.amount;

    await user.save();

    request.status = "approved";
    request.adminApprovedBy = adminName || "Admin";
    await request.save();

    res.json({
      success: true,
      message: "Withdraw request approved",
      request,
      walletBalance: user.walletBalance,
      addBkashAmount: user.addBkashAmount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});




// -------------------- Admin Reject Withdraw --------------------
router.post("/withdraw-reject/:id", async (req, res) => {
  try {
    const request = await WithdrawRequest.findById(req.params.id);
    if (!request)
      return res.status(404).json({ success: false, message: "Request not found" });

    if (request.status !== "pending")
      return res
        .status(400)
        .json({ success: false, message: "Request already processed" });

    request.status = "rejected";
    await request.save();

    res.json({
      success: true,
      message: "Withdraw request rejected",
      request,
    });
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


// ---------- Existing Add Funds ----------
router.post("/add", async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    const user = await UserData.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const amountNumber = parseFloat(amount);

    // ✅ Update both fields
    user.walletBalance = (user.walletBalance || 0) + amountNumber;
    user.addBkashAmount = (user.addBkashAmount || 0) + amountNumber; // <-- new field

    if (!user.walletHistory) user.walletHistory = [];
    user.walletHistory.push({
      amount: amountNumber,
      type: "add",
      createdAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: `Wallet credited with ৳${amountNumber}`,
      walletBalance: user.walletBalance,
      addBkashAmount: user.addBkashAmount, // <-- return new field
      history: user.walletHistory
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ---------- Get add history ----------
router.get("/add-history/:userId", async (req, res) => {
  try {
    const user = await UserData.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, history: user.walletHistory || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- Withdraw request routes (kept same as your code) ----------
router.post("/withdraw-request", async (req, res) => {
  const { userId, amount, method, paymentNumber } = req.body;
  if (!userId || !amount || isNaN(amount) || amount <= 0 || !method || !paymentNumber) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    const user = await UserData.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if ((user.walletBalance || 0) < amount) return res.status(400).json({ success: false, message: "Insufficient wallet balance" });

    user.walletBalance -= amount;
    await user.save();

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


// ---------------- bKash integration ----------------

// Use env variables in production. Example at bottom.

const BKASH_BASE_URL = process.env.BKASH_BASE_URL;
const APP_KEY = process.env.BKASH_APP_KEY;
const APP_SECRET = process.env.BKASH_APP_SECRET;
const USERNAME = process.env.BKASH_USERNAME;
const PASSWORD = process.env.BKASH_PASSWORD;


// ---------------- bKash integration (Sandbox Working 100%) ----------------


let pendingPayments = {};

// ------------------ Get Token ------------------
async function getBkashToken() {
  const res = await axios.post(
    `${BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    {
      app_key: APP_KEY,
      app_secret: APP_SECRET,
    },
    {
      headers: {
        username: USERNAME,
        password: PASSWORD,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data.id_token;
}

// ------------------- Create Payment -------------------
router.post("/wallet/create", async (req, res) => {
  try {
    const { userId, amount, userPhone, isSandbox = true } = req.body;

    const token = await getBkashToken();

    // Build request body
    const requestBody = {
      mode: "0011",
      callbackURL: "https://serverluckyshop.luckyshop.com.bd/api/wallet/bkash/callback",
      amount: amount.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: "INV-" + Date.now(),
    };

    // Handle payerReference
    if (isSandbox) {
      requestBody.payerReference = " "; // single space looks empty in sandbox
    } else if (userPhone) {
      requestBody.payerReference = userPhone; // live: only if userPhone exists
    }

    const response = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/create`,
      requestBody,
      {
        headers: {
          authorization: token,
          "x-app-key": APP_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    pendingPayments[response.data.paymentID] = {
      userId,
      amount,
      token,
    };

    res.json({
      success: true,
      bkashURL: response.data.bkashURL,
      paymentID: response.data.paymentID,
    });
  } catch (err) {
    console.log("CREATE ERROR", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Payment create failed",
    });
  }
});


// ------------------- bKash Callback -------------------
// ------------------- bKash Callback -------------------
router.get("/bkash/callback", async (req, res) => {
  try {
    const { paymentID, status } = req.query;

    if (status !== "success") {
      return res.send("<h2>Payment Failed ❌</h2>");
    }

    const session = pendingPayments[paymentID];
    if (!session) return res.send("Invalid Payment Session");

    const executeRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      {
        headers: {
          authorization: session.token,
          "x-app-key": APP_KEY,
        },
      }
    );

    if (executeRes.data.transactionStatus !== "Completed") {
      return res.send("<h2>Payment Failed ❌</h2>");
    }

    // ✅ Update user walletBalance and addBkashAmount
    const user = await UserData.findById(session.userId);
    const amountNumber = Number(session.amount);

    user.walletBalance = (user.walletBalance || 0) + amountNumber;
    user.addBkashAmount = (user.addBkashAmount || 0) + amountNumber; // <-- new field

    user.walletHistory.push({
      amount: amountNumber,
      type: "add",
      createdAt: new Date(),
    });

    await user.save();
    delete pendingPayments[paymentID];

    res.send(`
      <h1 style="color:green">Payment Successful ✔</h1>
      <p>Amount Added: ৳${amountNumber}</p>
      <a href="http://localhost:5173">Return to App</a>
    `);
  } catch (err) {
    console.log("EXECUTE ERROR", err.response?.data);
    res.send("<h2>Error executing payment ❌</h2>");
  }
});






export default router;

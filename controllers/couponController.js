import CouponPurchase from '../models/CouponPurchase.js';
import Winner from '../models/Winner.js';
import UserData from "../models/User.js";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
 const scheduledLotteries = {}; // track scheduled lotteries per product+round



// --- Send notification to all users who bought this round ---
const sendWinnerNotification = async (winner) => {
  try {
    const res = await axios.get("https://serverluckyshop.luckyshop.com.bd/api/auth/active-users");
    const users = res.data.users || [];

    console.log("Total users found:", users.length);

    for (const user of users) {
      try {
        // check if this user is the winner
        const isWinner =
          String(user._id) === String(winner.userId) ||
          user.email === winner.useremail ||
          user.phoneNumber === winner.userRegPhone;

        await axios.post("https://serverluckyshop.luckyshop.com.bd/api/notification/create", {
          userId: user._id, // always valid
          title: isWinner ? "🎉 Congratulations!" : "🏆 New Winner Announced!",
          message: isWinner
            ? `You won Round ${winner.round} for ${winner.productName}! 🏆`
            : `${winner.username} has won Round ${winner.round} for ${winner.productName}.`,
        });
      } catch (err) {
        console.error(
          `❌ Notification failed for ${user._id}:`,
          err.response?.data || err.message
        );
      }
    }

    console.log("All user notifications saved (winner + others)");

  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
  }
};

// Run lottery for a product if needed
const runLotteryIfNeeded = async (productId) => {
  try {
    const latestPurchase = await CouponPurchase.findOne({ productId }).sort({ round: -1 });
    if (!latestPurchase) return;

    const round = latestPurchase.round;
    const couponLimit = latestPurchase.couponlimit;
 const purchases = await CouponPurchase.find({ productId, round });
   const totalQty = purchases.reduce((sum, p) => sum + (p.quantity || 1), 0);

if (totalQty < couponLimit) return;  // round not filled yet
 // round not filled yet

    const existingWinner = await Winner.findOne({ productId, round });
    if (existingWinner) return; // ✅ winner already exists

    const lotteryKey = `${productId}_R${round}`;
    if (scheduledLotteries[lotteryKey]) return; // already scheduled

    console.log(`🎯 Lottery for product ${productId}, round ${round} scheduled`);

    scheduledLotteries[lotteryKey] = setTimeout(async () => {
      const latestPurchases = await CouponPurchase.find({ productId, round });
      if (!latestPurchases.length) return;

      // Pick random winner
      const winnerIndex = Math.floor(Math.random() * latestPurchases.length);
      const winnerPurchase = latestPurchases[winnerIndex];

      // ✅ productId stored as String (consistent with Winner schema)
      const safeProductId = String(productId);

      // Save winner
      const winner = new Winner({
        productId: safeProductId,
        productName: winnerPurchase.productName,
        couponId: winnerPurchase.couponId,
        username: winnerPurchase.username,
        useremail: winnerPurchase.useremail,
        userRegPhone: winnerPurchase.userRegPhone,
        userPhone: winnerPurchase.userPhone,
        productImage: winnerPurchase.productImage,
        round,
         status: "pending", 
      });

      await winner.save();
      console.log(`🏆 Winner selected: ${winner.username}`);

      // Broadcast notification to all logged-in users
      await sendWinnerNotification(winner);

      delete scheduledLotteries[lotteryKey];
    }, 60 * 1000); // optional delay if needed
  } catch (err) {
    console.error("Lottery error:", err.message);
  }
};



const BKASH_BASE_URL = process.env.BKASH_BASE_URL;
const APP_KEY = process.env.BKASH_APP_KEY;
const APP_SECRET = process.env.BKASH_APP_SECRET;
const USERNAME = process.env.BKASH_USERNAME;
const PASSWORD = process.env.BKASH_PASSWORD;

// Temporary store for pending payments
const pendingPayments = {};

// Get bKash token
export const getBkashToken = async () => {
  const res = await axios.post(
    `${BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    { app_key: APP_KEY, app_secret: APP_SECRET },
    { headers: { username: USERNAME, password: PASSWORD, "Content-Type": "application/json" } }
  );
  return res.data.id_token;
};

// Step 1: create payment
export const createBkashPayment = async (req, res) => {
  try {
    const {
      price,
      userPhone,
      productId,
      productName,
      productImage,
      username,
      useremail,
      userRegPhone,
      couponlimit,
      quantity,
      isSandbox = true
    } = req.body;

    const idToken = await getBkashToken();

    // Build request body
    const requestBody = {
  mode: "0011",
  amount: price.toString(),
  currency: "BDT",
  intent: "sale",
  merchantInvoiceNumber: "INV-" + Date.now(),
  callbackURL: `https://serverluckyshop.luckyshop.com.bd/api/coupons/callback`,
};


    // Sandbox requires a dummy payerReference; live uses real userPhone
    if (isSandbox) {
  requestBody.payerReference = " "; // single space instead of 01711111111
} else if (userPhone) {
  requestBody.payerReference = userPhone; // Live: only if user provides
}

    const createRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/create`,
      requestBody,
      {
        headers: {
          authorization: idToken,
          "x-app-key": APP_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const { paymentID, bkashURL } = createRes.data;

    pendingPayments[paymentID] = {
      productId,
      productName,
      productImage,
      username,
      useremail,
      userRegPhone,
      couponlimit,
      quantity,
      idToken,
    };

    res.json({ success: true, paymentID, bkashURL });
  } catch (err) {
    console.error("bKash createPayment error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data || err.message,
    });
  }
};


// Step 2: callback from bKash
export const bkashCallbackHandler = async (req, res) => {
  try {
    const paymentID = req.query.paymentID;
    if (!paymentID) return res.send("<h2>Payment Failed ❌</h2><p>PaymentID missing</p>");

    const userData = pendingPayments[paymentID];
    if (!userData) return res.send("<h2>Payment Failed ❌</h2><p>Payment data missing</p>");

    // Execute the payment
    const execRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      { headers: { authorization: userData.idToken, "x-app-key": APP_KEY, "Content-Type": "application/json" } }
    );

    const { trxID, transactionStatus, amount } = execRes.data;

    if (transactionStatus !== "Completed")
      return res.send("<h2>Payment Failed ❌</h2><p>Transaction not completed</p>");

    // ===== ROUND CALCULATION =====
    const latest = await CouponPurchase.findOne({ productId: userData.productId }).sort({ round: -1 });
    let round = 1;
    if (latest) {
      const count = await CouponPurchase.countDocuments({
        productId: userData.productId,
        round: latest.round,
      });

      round = count >= userData.couponlimit ? latest.round + 1 : latest.round;
    }

    const finalEmail = userData.useremail?.trim() || `${userData.userPhone}@noemail.com`;
    const finalPhone = userData.userPhone?.trim() || userData.userRegPhone?.trim() || "00000000000";

    const quantity = userData.quantity || 1;

    let allCoupons = [];

    // ===== CREATE MULTIPLE COUPONS BASED ON QUANTITY =====
    for (let i = 0; i < quantity; i++) {
      const couponId = `CPN-${nanoid(8).toUpperCase()}`;

      const purchase = new CouponPurchase({
        couponId,
        productId: userData.productId,
        productName: userData.productName,
        productImage: userData.productImage,
        price: amount,
        username: userData.username || "Guest",
        useremail: finalEmail,
        userPhone: finalPhone,
        quantity: 1, // each loop = one coupon
        userRegPhone: userData.userRegPhone || finalPhone,
        round,
        paymentMethod: "bKash",
        couponlimit: userData.couponlimit,
        metadata: { trxID, amount, paymentDate: new Date() },
      });

      await purchase.save();
      allCoupons.push(couponId);
    }

    delete pendingPayments[paymentID];

    await runLotteryIfNeeded(userData.productId);

    // Success Response With Multiple Coupons
    res.send(`
  <html>
    <head>
      <title>Payment Successful</title>

      <!-- Google Fonts -->
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">

      <!-- Confetti Script -->
      <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: #f7f7f7;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          animation: fadeIn 1s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card {
          background: white;
          padding: 40px;
          width: 90%;
          max-width: 520px;
          border-radius: 18px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          text-align: center;
          animation: fadeIn 1s ease-in-out;
        }

        .success-img {
          width: 120px;
          margin-bottom: 15px;
        }

        h2 {
          color: #16a34a;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .details {
          text-align: left;
          margin-top: 20px;
          padding: 15px 20px;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .btn-home {
          margin-top: 25px;
          padding: 12px 22px;
          background-color: #16a34a;
          color: white;
          font-size: 16px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: 0.3s;
        }

        .btn-home:hover {
          background-color: #118a3f;
        }

        ul {
          list-style-type: none;
          padding: 0;
          font-weight: 600;
          margin-top: 10px;
          color: #16a34a;
        }
      </style>
    </head>

    <body onload="launchConfetti()">
      <div class="card">
        
        <img src="https://cdn-icons-png.flaticon.com/512/148/148767.png" class="success-img" />

        <h2>🎉 Congratulations! 🎉</h2>
        <p>Your payment has been completed successfully.</p>

        <div class="details">
          <p><strong>Transaction ID:</strong> ${trxID}</p>
          <p><strong>Amount Paid:</strong> ${amount} BDT</p>
          <p><strong>Coupons Generated (${quantity}):</strong></p>
          <ul>
            ${allCoupons.map((c) => `<li>✔️ ${c}</li>`).join("")}
          </ul>
        </div>

        <button class="btn-home" onclick="window.location.href='https://luckyshop.com.bd/'">
          🏠 Go to Home
        </button>
      </div>

      <script>
        function launchConfetti() {
          // Burst confetti
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });

          // Continuous light confetti for premium feel
          setTimeout(() => {
            confetti({
              particleCount: 80,
              spread: 100,
              startVelocity: 25,
              origin: { x: Math.random(), y: 0 }
            });
          }, 500);
        }
      </script>
    </body>
  </html>
`);


  } catch (err) {
    console.error("bKash callback error:", err.response?.data || err.message);
    res.send(`<h2>Payment Failed ❌</h2><p>${err.response?.data?.message || err.message}</p>`);
  }
};



// export const createPurchase = async (req, res) => {
//   try {
//     const {
//       productId, productName, productImage, price,
//       username, useremail, userPhone, userRegPhone,
//       metadata, couponlimit
//     } = req.body;

//     if (!productId || !productName || !price) {
//       return res.status(400).json({ success: false, message: 'Missing fields' });
//     }

//     // Determine round
//     const latest = await CouponPurchase.findOne({ productId }).sort({ round: -1 });
//     let round = 1;
//     if (latest) {
//       const count = await CouponPurchase.countDocuments({ productId, round: latest.round });
//       round = count >= latest.couponlimit ? latest.round + 1 : latest.round;
//     }

//     const couponId = `CPN-${nanoid(8).toUpperCase()}`;
//     const purchase = new CouponPurchase({
//       couponId,
//       productId,
//       productName,
//       productImage,
//       price,
//       username,
//       useremail,
//       userPhone,
//       userRegPhone,
//       metadata,
//       couponlimit,
//       round
//     });

//     await purchase.save();

//     // Trigger lottery check
//     runLotteryIfNeeded(productId);

//     res.status(201).json({ success: true, purchase });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };





// --- GET ALL PURCHASES ---
export const getAllPurchases = async (req, res) => {
  try {
    const purchases = await CouponPurchase.find().sort({ createdAt: 1 });
    res.status(200).json({ success: true, coupons: purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- GET WINNERS ---
export const getWinners = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const total = await Winner.countDocuments();
    const winners = await Winner.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      winners,
      hasMore: total > page * limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getWinnerStats = async (req, res) => {
  try {
    const totalWinners = await Winner.countDocuments();
    const couponsWithWinners = await Winner.countDocuments({ productName: /voucher/i });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentWinners = await Winner.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    const pendingChoices = await Winner.countDocuments({ status: "pending" });
    const shippingChoices = await Winner.countDocuments({ status: "shipped" });
    const repurchaseChoices = await Winner.countDocuments({ status: "repurchase" });

    res.status(200).json({
      success: true,
      totalWinners,
      couponsWithWinners,
      recentWinners,
      pendingChoices,
      shippingChoices,
      repurchaseChoices,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// GET /api/coupons/winners?phone=01722327518&email=test@gmail.com
export const getWinnersmobile = async (req, res) => {
  try {
    const { phone, email } = req.query;

    // Create a query to filter by phone or email if provided
    const query = {};
    if (phone) query.userPhone = phone;
    if (email) query.useremail = email;

    const winners = await Winner.find(query).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      winners,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getActiveCoupons = async (req, res) => {
  try {
    const { email, phone } = req.query;

    // ১️⃣ user এর coupons
    const coupons = await CouponPurchase.find({
      $or: [{ userEmail: email }, { userPhone: phone }],
    });

    // ২️⃣ সব winners fetch
    const winners = await Winner.find();

    // ৩️⃣ active coupons filter করা
    const winnerProductIds = winners.map((w) => w.productId);
    const activeCoupons = coupons.filter(
      (c) => !winnerProductIds.includes(c.productId)
    );

    res.status(200).json({
      success: true,
      activeCoupons,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



export const purchaseCouponWithWalletController = async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const {
      auth,
      productId,
      productName,
      productImage,
      price,
      quantity = 1,
      username,
      useremail,
      userPhone,
      couponlimit
    } = req.body;

    if (!auth) return res.json({ success: false, message: "Auth required" });

    // Find user by phone/email
    const user = await UserData.findOne({
      $or: [{ phoneNumber: auth }, { email: auth }]
    });

    if (!user) return res.json({ success: false, message: "User not found" });

    // Check wallet balance for TOTAL price
    const totalPrice = price * quantity;

    if (user.walletBalance < totalPrice) {
      return res.json({
        success: false,
        message: "Insufficient wallet balance",
        walletBalance: user.walletBalance
      });
    }

    // Deduct wallet
    const beforeBalance = user.walletBalance;
    user.walletBalance -= totalPrice;
    await user.save();

    console.log(`Wallet deducted. Before: ${beforeBalance}, After: ${user.walletBalance}`);

    // =======================
    //   ROUND CALCULATION
    // =======================
    const latest = await CouponPurchase.findOne({ productId }).sort({ round: -1 });

    let round = 1;
    let currentRoundCount = 0;

    if (latest) {
      const purchases = await CouponPurchase.find({ productId, round: latest.round });
      currentRoundCount = purchases.reduce((sum, p) => sum + (p.quantity || 1), 0);

      round = currentRoundCount >= couponlimit ? latest.round + 1 : latest.round;
    }

    // Final email/phone
    const finalEmail = useremail?.trim() || `${userPhone}@noemail.com`;
    const finalPhone = userPhone?.trim() || "00000000000";

    let allCoupons = [];

    // =======================
    //   CREATE MULTIPLE COUPONS LIKE BKASH
    // =======================
    for (let i = 0; i < quantity; i++) {
      const couponId = `CPN-${nanoid(8).toUpperCase()}`;

      const purchase = new CouponPurchase({
        couponId,
        productId,
        productName,
        productImage,
        price,
        quantity: 1,
        username,
        useremail: finalEmail,
        userPhone: finalPhone,
        userRegPhone: finalPhone,
        couponlimit,
        round,
        paymentMethod: "wallet",
        isWalletPurchase: true,
        walletInfo: {
          before: beforeBalance,
          after: user.walletBalance,
          date: new Date()
        }
      });

      await purchase.save();
      allCoupons.push(couponId);

      // Increase count for each coupon
      currentRoundCount++;

      // If round is full → move to next round
      if (currentRoundCount >= couponlimit) {
        await runLotteryIfNeeded(productId);
        round++;
        currentRoundCount = 0;
      }
    }

    return res.json({
      success: true,
      message: "Coupon purchased via wallet successfully",
      coupons: allCoupons,
      newBalance: user.walletBalance
    });

  } catch (err) {
    console.error("Wallet purchase error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};


// --- GET MY PURCHASES ---
export const getMyPurchases = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const myPurchases = await CouponPurchase.find({ useremail: email }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, purchases: myPurchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getsMyPurchases = async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: "Missing email or phone" });
    }

    const query = {
      $or: [
        { userRegPhone: phone },
        { useremail: email }
      ]
    };

    const purchases = await CouponPurchase.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, coupons: purchases });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// --- DELETE PURCHASE ---
export const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CouponPurchase.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ success: false, message: 'Purchase not found' });

    res.status(200).json({ success: true, message: 'Purchase deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



// mobile 
export const getMyPurchasesmobile = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const myPurchases = await CouponPurchase.find({ "user.email": email }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, purchases: myPurchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* 🏆 Get Winners (mobile-friendly) */
// controllers/couponsController.js
export const getWinnersMobile = async (req, res) => {
  try {
    const { phone, email } = req.query;

    const query = {};
    if (phone) query.userPhone = phone;    // DB field
    if (email) query.useremail = email;    // DB field

    console.log("Querying winners with:", query); // debug

    const winners = await Winner.find(query).sort({ createdAt: 1 });

    console.log("Found winners:", winners.length); // debug

    res.status(200).json({ success: true, winners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};





/* 🏷️ Get Active Coupons (not yet won) */
export const getActiveCouponsmobile = async (req, res) => {
  try {
    const { email, phone } = req.query;
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: "Email or phone required" });
    }

    // Fetch all coupons for user
    const coupons = await CouponPurchase.find({
      $or: [
        { useremail: email },
        { userPhone: phone }
      ]
    });

    // Fetch winners
    const winners = await Winner.find({});
    const winnerMap = {};
    winners.forEach(w => { winnerMap[w.productId] = true; });

    // Filter only active coupons
    const activeCoupons = coupons.filter(c => !winnerMap[c.productId]);

    res.status(200).json({ success: true, activeCoupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

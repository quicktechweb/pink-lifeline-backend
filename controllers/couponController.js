import CouponPurchase from '../models/CouponPurchase.js';
import Winner from '../models/Winner.js';
import { nanoid } from "nanoid";
import mongoose from "mongoose";

import axios from "axios";
// --- Run Lottery Automatically ---
 const scheduledLotteries = {}; // track scheduled lotteries per product+round

// const runLotteryIfNeeded = async (productId) => {
//   try {
//     const latestPurchase = await CouponPurchase.findOne({ productId }).sort({ round: -1 });
//     if (!latestPurchase) return;

//     const round = latestPurchase.round;
//     const couponLimit = latestPurchase.couponlimit;

//     // Get all purchases for this round
//     const purchases = await CouponPurchase.find({ productId, round });
//     if (purchases.length < couponLimit) return; // round not filled yet

//     // Already a winner?
//     const existingWinner = await Winner.findOne({ productId, round });
//     if (existingWinner) return;

//     const lotteryKey = `${productId}_R${round}`;
//     if (scheduledLotteries[lotteryKey]) return; // already scheduled

//     console.log(`🎯 Lottery for product ${productId}, round ${round} scheduled in 1 minute`);

//     scheduledLotteries[lotteryKey] = setTimeout(async () => {
//       const latestPurchases = await CouponPurchase.find({ productId, round });
//       if (!latestPurchases.length) return;

//       // Pick random winner
//       const winnerIndex = Math.floor(Math.random() * latestPurchases.length);
//       const winnerPurchase = latestPurchases[winnerIndex];

//       const winner = new Winner({
//         productId: winnerPurchase.productId,
//         productName: winnerPurchase.productName,
//         couponId: winnerPurchase.couponId,
//         username: winnerPurchase.username,
//         useremail: winnerPurchase.useremail,
//         userRegPhone: winnerPurchase.userRegPhone,
//         userPhone: winnerPurchase.userPhone,
//         productImage: winnerPurchase.productImage,
//         round,
//       });

//       await winner.save();
//       console.log(`🏆 Winner selected for product ${productId}, round ${round}: ${winner.username}`);

//       delete scheduledLotteries[lotteryKey]; // remove scheduled flag
//     }, 60 * 1000); // 1 min delay

//   } catch (err) {
//     console.error('Lottery error:', err);
//   }
// };


// --- Send notification to all users who bought this round ---
const sendWinnerNotification = async (winner) => {
  try {
    const payload = {
      userId: "ALL_USERS", // interpreted by backend as broadcast
      title: "🎉 New Winner!",
      message: `${winner.username} won Round ${winner.round} for ${winner.productName}`,
    };

    await axios.post("http://localhost:5000/api/notification/create", payload);
    console.log(`Notification sent for winner: ${winner.username}`);
  } catch (err) {
    console.error("Error sending winner notification:", err.message);
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
    if (purchases.length < couponLimit) return; // round not filled yet

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



const BKASH_BASE_URL = "https://tokenized.pay.bka.sh/v1.2.0-beta";
const APP_KEY = "LGyJEehC0PlqQpQDFonuvggttc";
const APP_SECRET = "E8iXGDQwocrP1YCJMzUjddOXljv2OG8qnXAvDHQmWqEzoCNWBFpv";
const USERNAME = "01898932489";
const PASSWORD = "{KIbVP[Pf1[";

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
    const { price, userPhone, productId, productName, productImage, username, useremail, userRegPhone, couponlimit, isSandbox = true } = req.body;

    const idToken = await getBkashToken();

    const payerReference = isSandbox ? "01711111111" : userPhone || "";

    const createRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        mode: "0011",
        payerReference,
        callbackURL: `http://localhost:5000/api/coupons/callback`, // backend callback
        amount: price.toString(),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "INV-" + Date.now(),
      },
      { headers: { authorization: idToken, "x-app-key": APP_KEY, "Content-Type": "application/json" } }
    );

    const { paymentID, bkashURL } = createRes.data;

    pendingPayments[paymentID] = { productId, productName, productImage, username, useremail, userPhone, userRegPhone, couponlimit, idToken };

    res.json({ success: true, paymentID, bkashURL });
  } catch (err) {
    console.error("bKash createPayment error:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data || err.message });
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

    if (transactionStatus !== "Completed") return res.send("<h2>Payment Failed ❌</h2><p>Transaction not completed</p>");

    // Save transaction to DB
    const latest = await CouponPurchase.findOne({ productId: userData.productId }).sort({ round: -1 });
    let round = 1;
    if (latest) {
      const count = await CouponPurchase.countDocuments({ productId: userData.productId, round: latest.round });
      round = count >= userData.couponlimit ? latest.round + 1 : latest.round;
    }

    const couponId = `CPN-${nanoid(8).toUpperCase()}`;
    const finalEmail = userData.useremail?.trim() || `${userData.userPhone}@noemail.com`;
const finalPhone = userData.userPhone?.trim() || userData.userRegPhone?.trim() || "00000000000";

const purchase = new CouponPurchase({
  couponId,
  productId: userData.productId,
  productName: userData.productName,
  productImage: userData.productImage,
  price: amount,
  username: userData.username || "Guest",
  useremail: finalEmail,
  userPhone: finalPhone,
  userRegPhone: userData.userRegPhone || finalPhone,
  round,
  paymentMethod: "bKash",
  couponlimit: userData.couponlimit,
  metadata: { trxID, amount, paymentDate: new Date() },
});

    await purchase.save();
    delete pendingPayments[paymentID];

    await runLotteryIfNeeded(userData.productId);

    // Show success inside popup
    res.send(`
      <h2>Payment Successful ✅</h2>
      <p>Transaction ID: ${trxID}</p>
      <p>Amount Paid: ${amount} BDT</p>
      <p>Coupon ID: ${couponId}</p>
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
    const winners = await Winner.find().sort({ createdAt: 1 });
    res.status(200).json({ success: true, winners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
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

import express from "express";
import {
  createBkashPayment,
  bkashCallbackHandler,
  getAllPurchases,
  getWinners,
  getsMyPurchases,
  deletePurchase,
  getBkashToken,
  getActiveCoupons
} from "../controllers/couponController.js";

const router = express.Router();

// --- bKash Payment Flow ---
// Step 1: create payment (called by frontend)
router.post("/purchase", createBkashPayment);

// Step 2: bKash calls this GET after user enters PIN
router.get("/callback", bkashCallbackHandler);

// Optional: frontend can trigger execute manually if needed
router.post("/execute", bkashCallbackHandler);

// Optional: manually get token
router.get("/bkash-token", async (req, res) => {
  try {
    const token = await getBkashToken();
    res.json({ success: true, token });
  } catch (err) {
    console.error("Failed to get bKash token:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Coupon / Lottery Management ---
router.get("/", getAllPurchases);
router.get("/winners", getWinners);
router.get("/winnersmobile", getActiveCoupons);
router.get("/my", getsMyPurchases);
router.delete("/:id", deletePurchase);

export default router;

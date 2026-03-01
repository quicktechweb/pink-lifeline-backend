import express from "express";
import {
  createBkashPayment,
  bkashCallbackHandler,
  getAllPurchases,
  getWinners,
  getsMyPurchases,
  deletePurchase,
  getBkashToken,
  getActiveCoupons,
  getMyPurchasesmobile,
  getWinnersMobile,
  getWinnerStats,
  getActiveCouponsmobile,
  purchaseCouponWithWalletController
} from "../controllers/couponController.js";

const router = express.Router();

router.post("/purchase", createBkashPayment);

router.get("/callback", bkashCallbackHandler);

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
router.get("/winners/stats", getWinnerStats);
router.get("/winnersmobile", getActiveCoupons);
router.get("/my", getsMyPurchases);
router.delete("/:id", deletePurchase);

router.get("/mydata", getMyPurchasesmobile);

// Winners (mobile-friendly)
router.get("/winnersdata", getWinnersMobile);
router.post("/walletcoupon", purchaseCouponWithWalletController);

// Active Coupons
router.get("/activedata", getActiveCouponsmobile);

export default router;

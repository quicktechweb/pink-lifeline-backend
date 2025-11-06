import express from "express";
import axios from "axios";

const router = express.Router();
let idToken = null;

// Generate sandbox token
async function generateBkashToken() {
  try {
    const baseUrl = process.env.BKASH_BASE_URL;
    const username = process.env.BKASH_USERNAME;
    const password = process.env.BKASH_PASSWORD;
    const appKey = process.env.BKASH_APP_KEY;
    const appSecret = process.env.BKASH_APP_SECRET;

    const url = `${baseUrl}/token/grant`;

    const res = await axios.post(
      url,
      { app_key: appKey, app_secret: appSecret },
      { auth: { username, password }, headers: { "Content-Type": "application/json" } }
    );

    idToken = res.data.id_token;
    console.log("✅ Sandbox token generated");
    return idToken;
  } catch (err) {
    console.error("❌ Token generation failed:", err.response?.data || err.message);
    throw new Error("bKash token generation failed");
  }
}

// Create Payment
router.post("/create-payment", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!idToken) await generateBkashToken();

    const baseUrl = process.env.BKASH_BASE_URL;
    const appKey = process.env.BKASH_APP_KEY;
    const callbackURL = process.env.BKASH_CALLBACK_URL;

    const createURL = `${baseUrl}/checkout/create`;

    const payload = {
      mode: "0011",
      payerReference: "Customer123",
      callbackURL,
      amount,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: "INV_" + Date.now(),
    };

    const response = await axios.post(createURL, payload, {
      headers: { Authorization: idToken, "X-APP-Key": appKey, "Content-Type": "application/json" },
    });

    res.json(response.data);
  } catch (err) {
    console.error("❌ Create Payment Error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data || err.message });
  }
});

// Callback
router.post("/callback", (req, res) => {
  console.log("🔔 Callback received:", req.body);
  res.status(200).send("Callback received successfully");
});

export default router;

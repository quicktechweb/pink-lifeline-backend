import express from "express";
import nodemailer from "nodemailer";
import axios from "axios";
import User from "../models/User.js";

const router = express.Router();

// BulkSMSBD API keys
const BULKSMSBD_API_KEY = "TJiwADvi0MYQRHnn0vh8";
const SENDER_ID = "8809617611038";

// Nodemailer setup with Gmail App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "carp27711@gmail.com",         // <-- তোমার Gmail
    pass: "carcarcar",  // <-- Gmail App Password
  },
});

/* ===============================
   📌 GET ALL USERS
================================*/
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* ===============================
   📌 SEND BULK SMS / EMAIL
================================*/
router.post("/send", async (req, res) => {
  try {
    const { userIds, title, message, type } = req.body;

    if (!userIds?.length || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const users = await User.find({ _id: { $in: userIds } });

    // SMS পাঠানোর function
    const sendSMS = async (phone, text) => {
      const formattedPhone = phone.startsWith("88") ? phone : "88" + phone;
      const encodedMsg = encodeURIComponent(text);

      await axios.get(
        `http://bulksmsbd.net/api/smsapi?api_key=${BULKSMSBD_API_KEY}&number=${formattedPhone}&message=${encodedMsg}&type=text&senderid=${SENDER_ID}`
      );
    };

    // Email পাঠানোর function
    const sendEmail = async (email, subject, body) => {
  await transporter.sendMail({
    from: `"Lucky Shop" <carp27711@gmail.com>`,
    to: email,
    subject: subject || "Message from Lucky Shop",
    html: `<h3>Hello,</h3><p>${body}</p><br/><small>Sent by Lucky Shop</small>`,
  });
};


    // Loop করে সব selected users কে SMS/Email পাঠানো
    for (const u of users) {
      if (type === "sms") {
        await sendSMS(u.phoneNumber, message);
      } else if (type === "email") {
        await sendEmail(u.email, title, message);
      }
    }

    res.json({ success: true, message: "Messages sent successfully!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to send messages" });
  }
});

export default router;

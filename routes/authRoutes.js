import express from "express";
import axios from "axios";
import UserData from "../models/User.js";   // 👈 সঠিক model import
import { saveOtp, verifyOtp } from "../utils/otpStore.js";
import { nanoid } from "nanoid";
const router = express.Router();

// const BULKSMSBD_API_KEY = process.env.DB_SMS;
// const SENDER_ID = process.env.DB_SMSID;

const BULKSMSBD_API_KEY = "TJiwADvi0MYQRHnn0vh8";
const SENDER_ID = "8809617611038";

// ✅ Send OTP
router.post("/send-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!/^\d{11}$/.test(phoneNumber)) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  // Check if number already registered
  const existingUser = await UserData.findOne({ phoneNumber });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Phone number already registered" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  saveOtp(phoneNumber, otp);

  try {
    const formattedPhone = `88${phoneNumber}`;
    const message = encodeURIComponent(`Your OTP is: ${otp}`);

    const response = await axios.get(
      `http://bulksmsbd.net/api/smsapi?api_key=${BULKSMSBD_API_KEY}&number=${formattedPhone}&message=${message}&type=text&senderid=${SENDER_ID}`
    );

    if (response.data.response_code === 1000 || response.data.response_code === 202) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, message: "Failed to send SMS" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error sending OTP" });
  }
});

// ✅ Verify OTP
router.post("/verify-otp", (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (verifyOtp(phoneNumber, otp)) {
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, message: "Invalid OTP" });
});

// ✅ Register User
 router.post("/register", async (req, res) => {
  const { phoneNumber, password, displayName, referralCode } = req.body;

  try {
    // check existing user
    const existingUser = await UserData.findOne({ phoneNumber });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number already registered" });
    }

    // ✅ Generate myrefferalcode using nanoid
    const myrefferalcode = `REF-${nanoid(8).toUpperCase()}`;

    const newUser = new UserData({
      phoneNumber,
      password,
      displayName,
      referralCode,
      myrefferalcode,
    });

    await newUser.save();

    // ✅ Referral reward
    if (referralCode) {
      const referrer = await UserData.findOne({ myrefferalcode: referralCode });
      if (referrer) {
        referrer.walletBalance = (referrer.walletBalance || 0) + 5;
        await referrer.save();
        console.log(`✅ Added 5 Taka to ${referrer.displayName}'s wallet`);
      }
    }

    res.json({
      success: true,
      message: "User registered successfully",
      user: newUser,
    });
  } catch (err) {
    console.error("Register error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Error registering user" });
  }
});

// -------------------- LOGIN ------------------------
 router.post("/login", async (req, res) => {
  const { identifier, password } = req.body; // identifier = phone/email/uid

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: "Identifier & password required" });
  }

  try {
    const user = await UserData.findOne({
      $or: [
        { phoneNumber: identifier },
        { email: identifier },
        { uid: identifier },
      ],
    });

    if (!user) return res.status(400).json({ success: false, message: "User not registered" });
    if (user.status === "blocked") return res.status(403).json({ success: false, message: "Your account is blocked" });
    if (user.password !== password) return res.status(400).json({ success: false, message: "Incorrect password" });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Role API (by phone/email/uid)
router.get("/role", async (req, res) => {
  try {
    const { phoneNumber, email, uid } = req.query;

    if (!phoneNumber && !email && !uid) {
      return res.status(400).json({ success: false, message: "Provide phoneNumber or email or uid" });
    }

    const user = await UserData.findOne({
      $or: [
        phoneNumber ? { phoneNumber } : null,
        email ? { email } : null,
        uid ? { uid } : null,
      ].filter(Boolean),
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const role = (user.newpartroles || "").toString();

    const isAdmin = role.toLowerCase() === "admin";
    const isSubAdmin = role.toLowerCase() === "subadmin";
    const isSUPER = role.toLowerCase() === "superadmin";

    return res.json({
      success: true,
      role,
      admin: isAdmin,
      subadmin: isSubAdmin,
      SUPERadmin: isSUPER,
    });
  } catch (err) {
    console.error("Role check error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- Google Authentication ------------------------

// Google Register
 router.post("/google-register", async (req, res) => {
  try {
    const { displayName, email, uid } = req.body;
    if (!displayName || !email || !uid)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    let user = await UserData.findOne({ $or: [{ uid }, { email }] });
    if (!user) {
      user = new UserData({ displayName, email, uid });
      await user.save();
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error registering user" });
  }
});


router.get("/me/:id", async (req, res) => {
  try {
    const user = await UserData.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// all user show 
router.get("/alluser", async (req, res) => {
  try {
    const users = await UserData.find({});
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "No users found" });
    }
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- Block User ------------------------
router.patch("/blockuser/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const user = await UserData.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.status === "blocked") {
      return res.status(400).json({ success: false, message: "User already blocked" });
    }

    user.status = "blocked";
    await user.save();

    res.json({ success: true, message: "User blocked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- Unblock User ------------------------
router.patch("/unblockuser/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const user = await UserData.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.status === "active") {
      return res.status(400).json({ success: false, message: "User already active" });
    }

    user.status = "active";
    await user.save();

    res.json({ success: true, message: "User unblocked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// -------------------- Update profile ------------------------
router.put("/update/:id", async (req, res) => {
  try {
    const updated = await UserData.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

//  user role set 
// routes/userRoutes.js
// GET role by phone or email
router.get("/role", async (req, res) => {
  try {
    const { phoneNumber, email, uid } = req.query;

    if (!phoneNumber && !email && !uid) {
      return res.status(400).json({ success: false, message: "Provide phoneNumber or email or uid" });
    }

    const user = await UserData.findOne({
      $or: [
        phoneNumber ? { phoneNumber } : null,
        email ? { email } : null,
        uid ? { uid } : null,
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // আপনার DB এর role field যদি newpartroles হয়
    const role = (user.newpartroles || "").toString();

    const isAdmin = role.toLowerCase() === "admin" || role === "ADMIN";
    const isSubAdmin = role.toLowerCase() === "subadmin" || role === "SUBADMIN";
    const isSUPER = role.toLowerCase() === "superadmin" || role === "SUPERadmin" || role === "SUPERADMIN";

    return res.json({
      success: true,
      role,
      admin: isAdmin,
      subadmin: isSubAdmin,
      SUPERadmin: isSUPER,
    });
  } catch (err) {
    console.error("Role check error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

  
// permisson add features set 
 // ✅ Update User Role + Permissions
 // ✅ Update User Role + Permissions (MERGE version)
router.put("/update-user/:id", async (req, res) => {
  try {
    const { newpartroles, permissions } = req.body;

    // আগের ডেটা বের করো
    const user = await UserData.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // পুরানো permission object merge করে আপডেট করো
    const updatedPermissions = { ...user.permissions, ...permissions };

    user.newpartroles = newpartroles || user.newpartroles;
    user.permissions = updatedPermissions;

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "User role and permissions updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// localstorage refresh and update data 
router.get("/get-user/:id", async (req, res) => {
  try {
    const user = await UserData.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// active user login 
// -------------------- Active Users API ------------------------
router.get("/active-users", async (req, res) => {
  try {
    // ধরলাম: UserData collection-এ `status` ফিল্ড আছে (active / blocked)
    // অথবা তুমি চাইলে lastLogin / lastActivity দিয়েও ফিল্টার করতে পারো
    const activeUsers = await UserData.find({ status: "active" });

    if (!activeUsers || activeUsers.length === 0) {
      return res.status(404).json({ success: false, message: "No active users found" });
    }

    res.json({ success: true, users: activeUsers });
  } catch (err) {
    console.error("Active users fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



export default router;

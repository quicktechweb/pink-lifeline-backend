import express from "express";
import axios from "axios";
import UserData from "../models/User.js";   // 👈 সঠিক model import
import { saveOtp, verifyOtp } from "../utils/otpStore.js";
import { nanoid } from "nanoid";
import BadgeLevel from "../models/BadgeLevel.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import protect from "../middleware/jwt.js";
import bcrypt from "bcryptjs";

const router = express.Router();


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


router.post("/send-otp-data", async (req, res) => {
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
      // ⭐⭐⭐ এখানে শুধু JSON response পরিবর্তন করেছি ⭐⭐⭐
      return res.json({
        success: true,
        phoneNumber,
        otp,
        message: "OTP sent successfully"
      });
    } else {
      return res.status(500).json({ success: false, message: "Failed to send SMS" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error sending OTP" });
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
    const existingUser = await UserData.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Phone already registered" });
    }

    const myrefferalcode = `REF-${nanoid(8).toUpperCase()}`;
     const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new UserData({
      phoneNumber,
      password: hashedPassword,
      displayName,
      referralCode: referralCode || "",
      myrefferalcode
    });

    await newUser.save();

    // ------------------------
    // Referral Bonus Logic
    // ------------------------
    if (referralCode) {
      const directReferrer = await UserData.findOne({ myrefferalcode: referralCode });
      if (directReferrer) {
        // Direct referral
        directReferrer.walletBalance += 5;
        directReferrer.referralBalance = (directReferrer.referralBalance || 0) + 5;
        directReferrer.referralCount = (directReferrer.referralCount || 0) + 1;

        // Save referral history
        directReferrer.referralHistory.push({
          type: "direct",
          amount: 5,
          referredUser: phoneNumber
        });

        // Dynamic badge assignment
        const badges = await BadgeLevel.find();
        const userCount = directReferrer.referralCount;
        const badge = badges.find(b => userCount >= b.minCount && userCount <= b.maxCount);
        directReferrer.badge = badge ? badge.name : "None";

        await directReferrer.save();

        // Indirect referral (2 taka to referrer of direct referrer)
        if (directReferrer.referralCode) {
          const indirectReferrer = await UserData.findOne({ myrefferalcode: directReferrer.referralCode });
          if (indirectReferrer) {
            indirectReferrer.walletBalance += 2;
            indirectReferrer.referralBalance = (indirectReferrer.referralBalance || 0) + 2;

            // Save indirect referral history
            indirectReferrer.referralHistory.push({
              type: "indirect",
              amount: 2,
              referredUser: phoneNumber
            });

            // Badge update for indirect referrer
            const indirectBadge = badges.find(b => indirectReferrer.referralCount >= b.minCount && indirectReferrer.referralCount <= b.maxCount);
            indirectReferrer.badge = indirectBadge ? indirectBadge.name : "None";

            await indirectReferrer.save();
          }
        }
      }
    }

    res.json({
      success: true,
      message: "User registered successfully",
      user: newUser
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: err.message || "Error registering user" });
  }
});





// -------------------- LOGIN parts------------------------
 router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await UserData.findOne({
      $or: [
        { phoneNumber: identifier },
        { email: identifier },
        { uid: identifier },
      ],
    });

    if (!user) return res.status(400).json({ success: false, message: "User not found" });
    if (user.status === "blocked") return res.status(403).json({ success: false, message: "Account blocked" });

    const isMatch = await user.comparePassword(password);

    if (!isMatch) return res.status(400).json({ success: false, message: "Wrong password" });

    // Sign tokens
    const accessToken = signAccessToken(user);
console.log("Access Token:", accessToken); // 🔹 Token console e dekha jabe

    const refreshToken = signRefreshToken(user);

    // Send cookies + user data
    res
      .cookie("accessToken", accessToken, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 10*60*1000 })
      .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 7*24*60*60*1000 })
      .json({
        success: true,
        user: {
          _id: user._id,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          role: user.newpartroles,
        },
      });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/check-auth", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
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

router.post("/users/get-wallet", async (req, res) => {
  try {
    const { auth } = req.body;

    if (!auth) {
      return res.json({ walletBalance: 0, message: "No auth provided" });
    }

    // Check phone or email dynamically
    const user = await UserData.findOne({
      $or: [
        { phoneNumber: auth },
        { email: auth }
      ]
    });

    if (!user) {
      return res.json({ walletBalance: 0, message: "User not found" });
    }

    return res.json({
      walletBalance: user.walletBalance,
      message: "Wallet balance fetched"
    });

  } catch (err) {
    console.error("Wallet fetch error:", err);
    return res.json({ walletBalance: 0, message: "Server error" });
  }
});


// Google Register
router.post("/google-register", async (req, res) => {
  const { displayName, email, uid } = req.body;

  let user = await UserData.findOne({ $or: [{ uid }, { email }] });

  if (!user) {
    user = await UserData.create({
      displayName,
      email,
      uid,
      myrefferalcode: `REF-${nanoid(8).toUpperCase()}`,
      newpartroles: "user",
    });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    })
    .json({ success: true, user });
});



router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid refresh token" });

    const accessToken = createAccessToken({ id: decoded.id });
    res.json({ accessToken });
  });
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


router.delete("/delete/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const user = await UserData.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await UserData.findByIdAndDelete(userId);
    res.json({ success: true, message: "Your account has been deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



router.get("/my-referrals/:referralCode", async (req, res) => {
  const { referralCode } = req.params;

  if (!referralCode) {
    return res.status(400).json({ success: false, message: "Referral code is required" });
  }

  try {
    // Find users whose referralCode matches the given code
    const myReferrals = await UserData.find({ referralCode });

    if (!myReferrals || myReferrals.length === 0) {
      return res.status(404).json({ success: false, message: "No referrals found" });
    }

    res.json({ success: true, users: myReferrals });
  } catch (err) {
    console.error("Failed to fetch referrals:", err);
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
    const userId = req.params.id;

    // only allow these fields
    const {
      displayName,
      birthday,
      gender,
      address,
      avatar,
    } = req.body;

    const updateFields = {
      displayName,
      birthday,
      gender,
      address,
      avatar,
    };

    // remove undefined fields
    Object.keys(updateFields).forEach(
      (key) => updateFields[key] === undefined && delete updateFields[key]
    );

    const updatedUser = await UserData.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
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


// admin refferal 

router.get("/admin/referrals", async (req, res) => {
  try {
    const users = await UserData.find({});

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "No users found" });
    }

    const referralData = users.map(user => {
      // কারা এই user কে রেফার করেছে
      const referredUsers = users.filter(
        u => u.referralCode === user.myrefferalcode
      );

      return {
        userId: user._id,
        name: user.displayName || user.name,
        phone: user.phoneNumber,
        myReferralCode: user.myrefferalcode,
        totalReferrals: referredUsers.length, // কতজনকে রেফার করেছে
        referredUsers: referredUsers.map(r => ({
          name: r.displayName || r.name,
          phone: r.phoneNumber,
          joinedAt: r.createdAt,
        })),
      };
    });

    res.json({ success: true, referrals: referralData });
  } catch (err) {
    console.error("Failed to fetch referral history:", err);
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


// forget password 

// 1️⃣ Send OTP
// Send OTP for Forgot Password
router.post("/forgot-send-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!/^\d{11}$/.test(phoneNumber)) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  // Check if user exists
  const existingUser = await UserData.findOne({ phoneNumber });
  if (!existingUser) {
    return res.status(400).json({ success: false, message: "Phone number not registered" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  saveOtp(phoneNumber, otp); // your OTP store logic

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


router.post("/forgots-sends-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!/^\d{11}$/.test(phoneNumber)) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  // Check if user exists
  const existingUser = await UserData.findOne({ phoneNumber });
  if (!existingUser) {
    return res.status(400).json({ success: false, message: "Phone number not registered" });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  saveOtp(phoneNumber, otp); // save otp

  try {
    const formattedPhone = `88${phoneNumber}`;
    const message = encodeURIComponent(`Your OTP is: ${otp}`);

    const response = await axios.get(
      `http://bulksmsbd.net/api/smsapi?api_key=${BULKSMSBD_API_KEY}&number=${formattedPhone}&message=${message}&type=text&senderid=${SENDER_ID}`
    );

    if (response.data.response_code === 1000 || response.data.response_code === 202) {
      // ⬇⬇⬇ এখানে response এ OTP + phoneNumber পাঠানো হচ্ছে
      return res.json({
        success: true,
        phoneNumber,
        otp,
        message: "OTP sent successfully"
      });
    } else {
      return res.status(500).json({ success: false, message: "Failed to send SMS" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error sending OTP" });
  }
});

// Verify OTP
router.post("/forgot-verify-otp", (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (verifyOtp(phoneNumber, otp)) { // your OTP verification logic
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, message: "Invalid OTP" });
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { phoneNumber, newPassword } = req.body;

  try {
    const user = await UserData.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    user.password = newPassword; // optionally hash the password
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ BLOCK USER
router.patch("/blockuser/:phoneNumber", async (req, res) => {
  const { phoneNumber } = req.params;

  try {
    const user = await UserData.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check wallet balance
    if (user.walletBalance > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot block this user. User has ৳${user.walletBalance} in wallet.`
      });
    }

    // Optional: Add reason (frontend can send a reason)
    const reason = req.body.reason || "Blocked by admin";

    user.status = "blocked";
    user.blockReason = reason; // নতুন ফিল্ড block reason
    await user.save();

    return res.json({ success: true, message: "User blocked successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ UNBLOCK USER
router.patch("/unblockuser/:phoneNumber", async (req, res) => {
  const { phoneNumber } = req.params;

  try {
    const user = await UserData.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.status = "active";
    user.blockReason = null; // clear reason
    await user.save();

    return res.json({ success: true, message: "User unblocked successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});



// 3️⃣ Reset Password





export default router;

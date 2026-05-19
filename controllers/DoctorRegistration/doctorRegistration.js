import User from "../../models/DoctorRegistration/DoctorRegistration.js";
import { nanoid } from "nanoid";
import axios from "axios";
import { generateToken } from "../../utils/token.js";
import { badRequestResponse, successResponse } from "../../utils/utils.js";

const generateUserId = (type) => {
  const id = nanoid(6).toUpperCase();
  return type === "doctor" ? `DOC-${id}` : `USR-${id}`;
};

const IMGBB_API_KEY = "61b3c68f784244053d3df422e1c17879";

const uploadToImgBB = async (file) => {
  try {
    const base64Image = file.buffer.toString("base64");

    const url = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

    const formData = new URLSearchParams();
    formData.append("image", base64Image);

    const res = await axios.post(url, formData);

    return {
      url: res.data.data.url,
      delete_url: res.data.data.delete_url,
    };
  } catch (error) {
    console.error("ImgBB Upload Error:", error.response?.data || error.message);
    return null;
  }
};

// export const registerUser = async (req, res) => {
//   try {
//     // 🔥 parse qualifications
//     if (req.body.qualifications) {
//       req.body.qualifications = JSON.parse(req.body.qualifications);
//     }

//     const {
//       type,
//       fullName,
//       email,
//       phoneNumber,
//       doctorRegistrationNumber,
//       currentWorkplace,
//       currentDesignation,
//       aboutMe,
//       qualifications,
//     } = req.body;

//     // 🔍 Check existing user
//     const existing = await User.findOne({
//       $or: [{ phoneNumber }, { email }],
//     });

//     if (existing) {
//       return res.status(200).json({
//         success: false,
//         message: existing.email === email
//           ? "User already exists with this email"
//           : "User already exists with this phone number",
//       });
//     }

//     // 🔥 Upload image to ImgBB
//     let doctorIdCardData = {};

//     if (req.file) {
//       const uploaded = await uploadToImgBB(req.file);

//       if (uploaded) {
//         doctorIdCardData = {
//           url: uploaded.url,
//           deleteUrl: uploaded.delete_url,
//         };
//       }
//     }

//     // 🔥 Generate userId
//     const userId = generateUserId(type);

//     // 🧠 Create user
//     const newUser = await User.create({
//       userId,
//       type,
//       fullName,
//       email,
//       phoneNumber,
//       doctorRegistrationNumber,
//       currentWorkplace,
//       currentDesignation,
//       aboutMe,
//       qualifications,
//       doctorIdCard: doctorIdCardData,
//     });

//     // 🔐 JWT TOKEN GENERATE
//     const token = generateToken(newUser);

//     return res.status(200).json({
//       success: true,
//       message: "Registration successful",
//       token, // 🔥 JWT ADDED
//       data: newUser,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(200).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };




























export const registerUser = async (req, res) => {
  try {



    const {
      type, // 1 = doctor, 0 = user
      fullName,
      email,
      phoneNumber,
      doctorRegistrationNumber,
      currentWorkplace,
      currentDesignation,
      aboutMe,
      qualifications,
    } = req.body;

    
    if (typeof qualifications === "string") {
      qualifications = JSON.parse(qualifications);
    }


    let conditions = []
    
    if (phoneNumber) {
      conditions.push({ phoneNumber });
    }

    if (email) {
      conditions.push({ email });
    }

    if (type === 1 && !phoneNumber) {
      badRequestResponse(res, "Phone Number is required for doctor registration.","Phone number is not found." )
      return;
    }

    if (phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber });

      if (phoneExists) {
        return res.status(200).json({
          success: false,
          message: "User already exists with this phone number" + (phoneExists.type === 1 ? " as a doctor" : " as a user"),
        });
      }
    }

    // 🔍 check existing
    const existing = await User.findOne({
      $or: conditions,
    });


    if (existing && existing.email === email) {
      return res.status(200).json({
        success: false,
        message: "User already exists with this email" + (existing.type === 1 ? " as a doctor" : " as a user"),
      });
    }

    // 🔥 ROLE LOGIC (MAIN FIX)
    const isDoctor = Number(type) === 1 ? 1 : 0;
    const isUser = Number(type) === 1 ? 0 : 1;

    // 🔥 upload image
    let doctorIdCardData = {};

    if (req.file) {
      const uploaded = await uploadToImgBB(req.file);

      if (uploaded) {
        doctorIdCardData = {
          url: uploaded.url,
          deleteUrl: uploaded.delete_url,
        };
      }
    }

    // 🔥 generate userId
    const userId = generateUserId(type);

    // 🧠 create user
    const newUser = await User.create({
      userId,
      type: Number(type),
      fullName,
      email,
      phoneNumber,
      doctorRegistrationNumber,
      currentWorkplace,
      currentDesignation,
      aboutMe,
      qualifications,
      doctorIdCard: doctorIdCardData,

      isDoctor,
      isUser,
    });

    // 🔐 JWT token
    const token = generateToken(newUser);

    // 🎯 clean response (ONLY ONE FLAG SHOW)
    const responseUser = {
      _id: newUser._id,
      userId: newUser.userId,
      type: newUser.type,
      fullName: newUser.fullName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      doctorRegistrationNumber: newUser.doctorRegistrationNumber,
      currentWorkplace: newUser.currentWorkplace,
      currentDesignation: newUser.currentDesignation,
      aboutMe: newUser.aboutMe,
      qualifications: newUser.qualifications,
      doctorIdCard: newUser.doctorIdCard,

      ...(Number(type) === 1 ? { isDoctor: 1 } : { isUser: 0 }),
    };

    return res.status(200).json({
      success: true,
      message: "Registration successful",
      token,
      data: responseUser,
    });
  } catch (error) {
    console.error(error);

    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};













































export const loginUser = async (req, res) => {
  try {
    const { email } = req.body;

    // 🔍 check user by email only
    const user = await User.findOne({ email });

    // ❌ not found
    if (!user) {
      return res.status(200).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // 🔐 generate token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: user,
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

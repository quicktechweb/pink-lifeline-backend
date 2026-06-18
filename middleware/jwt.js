import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const verifyToken = (req, res, next) => {
  try {
    let token;
    
    // Cookie
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    // Authorization header
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. No token provided.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
      console.log("🚀 ~ jwt.js:6 ~ verifyToken ~ error:", error)
    return res.status(401).json({
      success: false,
      message: "Token expired or invalid",
    });
  }
};

export default verifyToken;
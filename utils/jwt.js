import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.newpartroles },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "10m" }
  );

export const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

import { ENV } from "../constant/constant.js";

export const devOnly = (req, res, next) => {
  console.log("🚀 ~ checkEnviornment.js:4 ~ devOnly ~ ENV:", ENV);
  if (ENV === "dev") {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: "Bad request.",
  });
};

// Temporary in-memory store
const otpStore = {};

export function saveOtp(phone, otp) {
  otpStore[phone] = otp;
}

export function verifyOtp(phone, otp) {
  if (otpStore[phone] === otp) {
    delete otpStore[phone];
    return true;
  }
  return false;
}

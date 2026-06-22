import mongoose from "mongoose";

const userFCMTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    fcmTokens: [
      {
        type: String,
      },


      //all types are here 

    // "periodDate", 
    // "missedSelfTest", 
    // "post", 
    // "doctorAppointment", 
    // "patientAppointment",



    ],
  },
  {
    timestamps: true,
  }
);

const UserFCMToken = mongoose.model(
  "UserFCMToken",
  userFCMTokenSchema
);

export default UserFCMToken;
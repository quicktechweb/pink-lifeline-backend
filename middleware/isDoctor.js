import User from '../models/DoctorRegistration/DoctorRegistration.js';
import { notFoundResponse } from '../utils/utils.js';

export const isDoctor = async (req, res, next) => {
  const { userId } = req.params;
  const isDoctor = await User.findOne({ userId, type: 1 });
  if (isDoctor) {
    console.log('doctor found');
    next();
  } else {
    notFoundResponse(res, 'Doctor not found.', `Invalid doctor id...${userId}`);
  }
};

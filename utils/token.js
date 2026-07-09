import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      userId: user.userId,
      email: user.email,
      type: user.type,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

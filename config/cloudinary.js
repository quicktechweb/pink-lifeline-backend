import { v2 as cloudinary } from 'cloudinary';

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

cloudinary.config({
  cloud_name: 'da71nazot',
  api_key: '192712237995922',
  api_secret: 'tOTAxwAG_IqmE4wiDsZyHCQSa2w',
});

export default cloudinary;

import axios from 'axios';
import FormData from 'form-data';

export const uploadToImageBB = async (file) => {
  try {
    /**
     * Safety check
     */
    if (!file || !file.buffer) {
      throw new Error('File buffer missing');
    }

    /**
     * Convert image buffer -> base64
     */
    const base64Image = file.buffer.toString('base64');

    /**
     * Create form data
     */
    const formData = new FormData();

    formData.append('image', base64Image);

    /**
     * Upload request
     */
    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${process.env.IMAGE_BB_API_KEY}`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // IMAGE_BB_RESPONSE:
    /**
     * Return image URL
     */
    return response.data.data.url;
  } catch (error) {
    console.error(
      'IMAGE_BB_UPLOAD_ERROR:',
      error.response?.data || error.message
    );

    throw new Error('Failed to upload image');
  }
};

import Pixel from "../models/Pixel.js";

// Save or Update Pixel ID
export const saveOrUpdatePixel = async (req, res) => {
  try {
    const { pixelId } = req.body;
    if (!pixelId) return res.status(400).json({ message: "Pixel ID required" });

    let pixel = await Pixel.findOne();
    if (pixel) {
      pixel.pixelId = pixelId; // Update
      await pixel.save();
    } else {
      pixel = await Pixel.create({ pixelId }); // Create
    }

    res.status(200).json({ pixel, message: "Pixel ID saved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Pixel ID
export const getPixel = async (req, res) => {
  try {
    const pixel = await Pixel.findOne();
    res.status(200).json(pixel || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

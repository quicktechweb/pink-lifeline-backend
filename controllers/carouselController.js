import Carousel from "../models/Carousel.js";

// Get all slides
export const getSlides = async (req, res) => {
  try {
    const carousel = await Carousel.findOne();
    if (!carousel) return res.status(404).json({ message: "Carousel not found" });
    res.json({ slides: carousel.slides });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch slides", error: err.message });
  }
};

// Update a slide
export const updateSlide = async (req, res) => {
  try {
    const { id } = req.params; // slide id
    const { title, buttonText, img1 } = req.body;

    const carousel = await Carousel.findOne();
    if (!carousel) return res.status(404).json({ message: "Carousel not found" });

    const slide = carousel.slides.id(id);
    if (!slide) return res.status(404).json({ message: "Slide not found" });

    slide.title = title || slide.title;
    slide.buttonText = buttonText || slide.buttonText;
    slide.img1 = img1 || slide.img1;

    await carousel.save();
    res.json({ message: "Slide updated successfully", slide });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

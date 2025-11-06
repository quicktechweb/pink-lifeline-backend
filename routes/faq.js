import express from "express"; // ✅ add this at the top

const router = express.Router();
import  FAQ from "../models/FAQ.js";

// GET FAQ
router.get("/", async (req, res) => {
  try {
    const faq = await FAQ.findOne();
    res.status(200).json({ success: true, data: faq });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT FAQ (update header or faqs)
router.put("/:id", async (req, res) => {
  try {
    const { header, faqs } = req.body;
    const updatedFaq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { header, faqs },
      { new: true }
    );
    res.status(200).json({ success: true, data: updatedFaq });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
const router = express.Router();
import  ContactUs from "../models/ContactUs.js";

/**
 * GET /api/contactus
 * Return the single contactus document. If missing, create default and return it.
 */
router.get("/", async (req, res) => {
  try {
    let doc = await ContactUs.findOne({});
    if (!doc) {
      // Create default seed document (can be customized)
      doc = await ContactUs.create({
        pageTitle: "Contact Us",
        subtitle: "For Any Further Questions.",
        backgroundImage: "https://www.global.ubuy.com/skin/frontend/default/ubuycom-v1/images/support-bg.svg",
        cards: [
          {
            id: 1,
            title: "Make Money With Us",
            icon: "https://www.global.ubuy.com/skin/frontend/default/ubuycom-v1/images/Money-icon.svg",
            description: "Affiliate programs are common throughout the Internet ...",
            linkText: "Click here for more details",
            linkUrl: "#"
          },
          {
            id: 2,
            banner: {
              textMain: "Enjoy Chat and Email support in your native language to get your queries answered more effectively.",
              textSub: "Calls support in English only.",
              image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9rescb2qLuFt7ZgL95xr0UqeqFVAfyKIYj7BYUHOnvR5ivz6K7LyLafKczbBMvmp_pjQ&usqp=CAU"
            },
            form: {
              title: "Drop your query!",
              options: ["-- Please select --", "Order Support", "Technical Help", "General Inquiry"],
              buttonText: "💬 WhatsApp"
            },
            contactInfo: {
              phoneNote: "📞 English customer support only",
              email: "info@luckyshop.com"
            }
          }
        ]
      });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

/**
 * PUT /api/contactus/:id
 * Update the contactus document (partial update allowed)
 */
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const update = { ...req.body, updatedAt: new Date() };

    const updatedDoc = await ContactUs.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updatedDoc) return res.status(404).json({ success: false, error: "Not found" });

    res.json({ success: true, data: updatedDoc });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

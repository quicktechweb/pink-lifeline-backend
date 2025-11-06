// routes/shippingPolicy.js
import express from "express"; // ✅ add this at the top
const router = express.Router();
import  ShippingPolicy from "../models/ShippingPolicy.js";

// 🔹 GET existing policy
router.get("/", async (req, res) => {
  try {
    let policy = await ShippingPolicy.findOne({ _id: "termshipping001" });

    if (!policy) {
      policy = await ShippingPolicy.create({
        _id: "termshipping001",
        pageTitle: "Shipping Policy",
        subtitle:
          "Learn about our shipping methods, delivery timelines, and more.",
        backgroundImage:
          "https://www.global.ubuy.com/skin/frontend/default/ubuycom-v1/images/support-bg.svg",
        sections: [],
      });
    }

    res.json({ success: true, data: policy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🔹 Update the entire policy safely (only changed fields)
router.put("/:id", async (req, res) => {
  try {
    const updates = req.body;

    // prevent empty sections from overwriting existing ones
    if (updates.sections && updates.sections.length === 0) {
      delete updates.sections;
    }

    const updated = await ShippingPolicy.findOneAndUpdate(
      { _id: req.params.id },
      { $set: updates },
      { new: true, runValidators: false } // disable deep validation
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🔹 Add new section
router.post("/section", async (req, res) => {
  try {
    const { title, text, table, cta } = req.body;
    if (!title || !text)
      return res.status(400).json({ success: false, message: "Title & text are required" });

    const policy = await ShippingPolicy.findOne({ _id: "termshipping001" });
    if (!policy)
      return res.status(404).json({ success: false, message: "Policy not found" });

    policy.sections.push({ title, text, table, cta });
    await policy.save();

    res.json({ success: true, data: policy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🔹 Edit one section
router.put("/section/:index", async (req, res) => {
  try {
    const { index } = req.params;
    const { title, text, table, cta } = req.body;

    const policy = await ShippingPolicy.findOne({ _id: "termshipping001" });
    if (!policy)
      return res.status(404).json({ success: false, message: "Policy not found" });

    if (!policy.sections[index])
      return res.status(400).json({ success: false, message: "Invalid section index" });

    policy.sections[index] = {
      ...policy.sections[index]._doc,
      ...(title && { title }),
      ...(text && { text }),
      ...(table && { table }),
      ...(cta && { cta }),
    };

    await policy.save();
    res.json({ success: true, data: policy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
import Supplier from "../models/Supplier.js";
import Purchase from "../models/Purchase.js";

const router = express.Router();

/**
 * 📝 1. Get all suppliers
 */
router.get("/", async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 📌 2. Get single supplier (for edit page)
 */
router.get("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * ✏️ 3. Update Supplier info
 */
router.put("/:id", async (req, res) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Supplier not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 💰 4. Add Payment for Supplier
 */
router.post("/:id/payment", async (req, res) => {
  try {
    const { amount, paymentDate, note } = req.body;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const payment = {
      amount: Number(amount),
      date: paymentDate ? new Date(paymentDate) : new Date(),
      note,
    };

    supplier.payments.push(payment);

    // ✅ Update due balance
    supplier.dueBalance = supplier.dueBalance - Number(amount);
    if (supplier.dueBalance < 0) supplier.dueBalance = 0;

    await supplier.save();
    res.status(201).json({ message: "Payment added successfully", supplier });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 🧾 5. Get Invoice / Payment History
 */
 router.get("/:id/invoice", async (req, res) => {
  try {
    // ✅ 1. Find supplier by ID
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    // ✅ 2. Fetch all purchases of this supplier
    const purchases = await Purchase.find({ supplier: supplier.name }).sort({ createdAt: 1 });

    let runningBalance = 0;
    const invoiceData = [];

    // ✅ 3. Push purchase records with dueAmount & note
    purchases.forEach((p) => {
      runningBalance += p.totalAmount - p.paidAmount;
      invoiceData.push({
        date: new Date(p.purchaseDate).toLocaleDateString(),  // purchaseDate used
        invoiceNo: p.invoiceNo || p._id,                      // prefer invoiceNo if available
        debit: p.totalAmount,
        credit: p.paidAmount,
        due: p.dueAmount || 0,
        note: p.note || "",
        balance: runningBalance,
      });
    });

    // ✅ 4. Push supplier payments
    if (Array.isArray(supplier.payments)) {
      supplier.payments.forEach((pay) => {
        runningBalance -= pay.amount;
        invoiceData.push({
          date: new Date(pay.date).toLocaleDateString(),
          invoiceNo: "",
          debit: 0,
          credit: pay.amount,
          due: 0, // Payments don't have due
          note: pay.note || "Payment",
          balance: runningBalance,
        });
      });
    }

    // ✅ 5. Sort all by date to maintain correct order
    invoiceData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ✅ 6. Send final result
    res.json(invoiceData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

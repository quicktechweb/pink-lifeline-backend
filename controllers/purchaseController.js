import Purchase from "../models/Purchase.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";

// ✅ Create New Purchase
export const createPurchase = async (req, res) => {
  try {
    // Create purchase
    const purchase = new Purchase(req.body);
    const savedPurchase = await purchase.save();

    // Update supplier balances
    const supplier = await Supplier.findOne({ name: purchase.supplier });
    if (supplier) {
      supplier.mainBalance = (supplier.mainBalance || 0) + purchase.totalAmount;
      supplier.dueBalance = (supplier.dueBalance || 0) + purchase.dueAmount;
      await supplier.save();
    }

    // Update product stock
    for (const item of purchase.items) {
      const product = await Product.findOne({ title: item.product });
      if (product) {
        // ✅ Use Mongoose update to avoid save issues
        await Product.updateOne(
          { _id: product._id },
          { $inc: { stock: item.qty } } // increment stock by purchased qty
        );
      } else {
        console.warn("⚠️ Product not found:", item.product);
      }
    }

    res.status(201).json(savedPurchase);
  } catch (error) {
    console.error("❌ Purchase create error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
// ✅ Get All Purchases (with Supplier & Product populated)
export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("supplier", "name")
      .populate("items.product", "title");
    res.json(purchases);
  } catch (error) {
    console.error("❌ Get Purchases Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const newData = req.body;

    // Ensure numeric fields are numbers (even if 0 or empty)
    newData.totalAmount = Number(newData.totalAmount ?? 0);
    newData.dueAmount = Number(newData.dueAmount ?? 0);
    newData.paidAmount = Number(newData.paidAmount ?? 0);

    // Ensure items array exists
    newData.items = Array.isArray(newData.items) ? newData.items : [];

    // 1️⃣ Get existing purchase
    const oldPurchase = await Purchase.findById(purchaseId);
    if (!oldPurchase) return res.status(404).json({ message: "Purchase not found" });

    // 2️⃣ Adjust supplier balances
    const supplier = await Supplier.findOne({ name: oldPurchase.supplier });
    if (supplier) {
      // Remove old amounts
      supplier.mainBalance = (supplier.mainBalance || 0) - (oldPurchase.totalAmount || 0);
      supplier.dueBalance = (supplier.dueBalance || 0) - (oldPurchase.dueAmount || 0);

      // Add new amounts
      supplier.mainBalance += newData.totalAmount;
      supplier.dueBalance += newData.dueAmount;

      await supplier.save();
    }

    // 3️⃣ Adjust product stocks
    // Decrease old purchase stock
    for (const item of oldPurchase.items || []) {
      const product = await Product.findOne({ title: item.product });
      if (product) {
        product.stock = Math.max((product.stock || 0) - (item.qty || 0), 0);
        await product.save();
      }
    }

    // Increase stock for new purchase items
    for (const item of newData.items || []) {
      const product = await Product.findOne({ title: item.product });
      if (product) {
        product.stock = (product.stock || 0) + (item.qty || 0);
        await product.save();
      }
    }

    // 4️⃣ Update purchase document
    const updatedPurchase = await Purchase.findByIdAndUpdate(purchaseId, newData, { new: true });

    res.json(updatedPurchase);
  } catch (error) {
    console.error("❌ Update Error:", error);
    res.status(500).json({ message: error.message });
  }
};




// ✅ GET all purchases


// ✅ GET single purchase (View)
export const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    res.status(200).json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE purchase
export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    // ✅ Decrease supplier balance
    const supplier = await Supplier.findOne({ name: purchase.supplier });
    if (supplier) {
      supplier.mainBalance -= purchase.totalAmount;
      supplier.dueBalance -= purchase.dueAmount;
      await supplier.save();
    }

    // ✅ Decrease product stock
    for (const item of purchase.items) {
      const product = await Product.findOne({ title: item.product });
      if (product) {
        product.stock = Math.max((product.stock || 0) - item.qty, 0);
        await product.save();
      }
    }

    // ✅ Delete purchase
    await purchase.deleteOne();
    res.status(200).json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("❌ Delete error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

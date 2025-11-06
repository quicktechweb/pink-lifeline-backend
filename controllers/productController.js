import AllProduct from "../models/AllProduct.js";

export const getProducts = async (req, res) => {
  try {
    const products = await AllProduct.find()
      .populate("categoryId")
      .populate("subcategoryId")
      .populate("childcategoryId");

    res.json(products);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    console.log("📩 Incoming Product Data:", req.body);

    const newProduct = new AllProduct(req.body);
    await newProduct.save();

    res.json(newProduct);
  } catch (err) {
    console.error("❌ Error creating product:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const updatedProduct = await AllProduct.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedProduct) return res.status(404).json({ message: "Product not found" });

    res.json(updatedProduct);
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await AllProduct.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: err.message });
  }
};

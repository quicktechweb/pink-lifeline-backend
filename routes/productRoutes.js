import express from "express";
import Product from "../models/Product.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import { imageHash } from "image-hash";
const router = express.Router();



// CREATE
router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL
router.get("/", async (_, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// DELETE
router.delete("/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

router.get("/topselling", async (req, res) => {
  try {
    const products = await Product.find({ type: "topselling" }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ READ SINGLE PRODUCT
router.get("/details/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    // মূল product fetch
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Related products fetch (same category/subcategory/childcategory)
    const relatedProducts = await Product.find({
      _id: { $ne: productId }, // মূল product বাদ
      $or: [
        { categoryName: product.categoryName },
        { subcategoryName: product.subcategoryName },
        { childcategoryName: product.childcategoryName }
      ]
    }).limit(10);

    res.status(200).json({
      success: true,
      product,
      relatedProducts
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Add Review Route
router.post("/:id/review", async (req, res) => {
  try {
    const { userAuth, rating, comment, photos } = req.body;

    const newReview = {
      userAuth,
      rating,
      comment,
      photos,
      date: new Date(),
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: newReview } },
      { new: true }
    );

    if (!updatedProduct) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ message: "Review added successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ IMAGE SEARCH (Vision API)
// ✅ IMAGE SEARCH (Vision API with debug logs)
const upload = multer({ dest: "uploads/" });

// ✅ Download image temporarily
const downloadImage = async (url, tempPath) => {
  const writer = fs.createWriteStream(tempPath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

// ✅ Generate hash for image
const getImageHash = (filePath) => {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    });
  });
};

// ✅ Compute Hamming distance between two hashes
const hammingDistance = (hash1, hash2) => {
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
};

// ✅ Image Search Route (Optimized)
router.post("/image-search", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const uploadedPath = req.file.path;
    const uploadedHash = await getImageHash(uploadedPath);
    console.log("📸 Uploaded Hash:", uploadedHash);

    const products = await Product.find({}, { images: 1, title: 1, categoryName: 1, subcategoryName: 1, childcategoryName: 1 });

    // ✅ Process all product images in parallel
    const matches = [];

    await Promise.all(
      products.map(async (product) => {
        if (!product.images || !product.images.length) return;

        for (const imgUrl of product.images) {
          const tempFile = path.join("uploads", `${Date.now()}_${path.basename(imgUrl)}`);
          try {
            await downloadImage(imgUrl, tempFile);
            const dbHash = await getImageHash(tempFile);
            const distance = hammingDistance(uploadedHash, dbHash);
            fs.unlink(tempFile, () => {}); // 🔹 delete after use (non-blocking)

            if (distance <= 10) {
              matches.push({
                _id: product._id,
                title: product.title,
                categoryName: product.categoryName,
                subcategoryName: product.subcategoryName,
                childcategoryName: product.childcategoryName,
                image: imgUrl,
                link: `/category/${encodeURIComponent(product.categoryName)}/${encodeURIComponent(product.subcategoryName)}/${encodeURIComponent(product.childcategoryName)}`
              });
              break; // stop checking more images of this product
            }
          } catch (err) {
            fs.unlink(tempFile, () => {}); // clean up on error
          }
        }
      })
    );

    fs.unlinkSync(uploadedPath); // 🔹 delete uploaded user image

    console.log("✅ Found Matches:", matches.length);
    res.json(matches);
  } catch (err) {
    console.error("❌ Image Search Error:", err);
    res.status(500).json({ message: "Image search failed", error: err.message });
  }
});



export default router;

import express from "express";
import Product from "../models/Product.js";
import CouponPurchase from "../models/CouponPurchase.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import slugify from "slugify";

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

router.get("/searchvalue", async (req, res) => {
  try {
    const q = req.query.q || "";

    const products = await Product.find({
      $or: [
        { categoryName: { $regex: q, $options: "i" } },
        { subcategoryName: { $regex: q, $options: "i" } },
        { childcategoryName: { $regex: q, $options: "i" } },
        { brandName: { $regex: q, $options: "i" } },
        { title: { $regex: q, $options: "i" } }
      ]
    });

    res.json({ success: true, data: products });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET all campaigns
router.get("/campaindata", async (req, res) => {
  try {
    const campaigns = await Product.aggregate([
      { $match: { campaignName: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$campaignId",
          campaignName: { $first: "$campaignName" },
          campaignImg: { $first: "$campaignImg" },
        },
      },
      { $sort: { campaignName: 1 } },
    ]);
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch campaigns" });
  }
});

// GET products by campaignId
router.get("/:campaignId/products", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const products = await Product.find({ campaignId });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

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


router.get("/details/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Main Product
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // 2️⃣ Main product coupons
    const coupons = await CouponPurchase.find({ productId: id }).lean();

    // Latest round
    const latestRound = coupons.length ? Math.max(...coupons.map(c => c.round || 1)) : 1;
    let sold = coupons.filter(c => c.round === latestRound).length;
    const totalcupon = product.totalcupon || 0;
    if (sold >= totalcupon) sold = 0;
    const remaining = Math.max(totalcupon - sold, 0);
    const progress = totalcupon > 0 ? (sold / totalcupon) * 100 : 0;

    // 3️⃣ Related Products Fetch
    const relatedProducts = await Product.find({
      _id: { $ne: id },
      $or: [
        { categoryName: product.categoryName },
        { subcategoryName: product.subcategoryName },
        { childcategoryName: product.childcategoryName }
      ]
    }).lean(); // lean for speed

    // 4️⃣ Attach stats to each related product
    for (let rp of relatedProducts) {
      const rpCoupons = await CouponPurchase.find({ productId: rp._id }).lean();

      const rpLatestRound = rpCoupons.length
        ? Math.max(...rpCoupons.map(c => c.round || 1))
        : 1;

      let rpSold = rpCoupons.filter(c => c.round === rpLatestRound).length;
      const rpTotalcupon = rp.totalcupon || 0;
      if (rpSold >= rpTotalcupon) rpSold = 0;

      const rpRemaining = Math.max(rpTotalcupon - rpSold, 0);
      const rpProgress = rpTotalcupon > 0 ? (rpSold / rpTotalcupon) * 100 : 0;

      rp.stats = {
        sold: rpSold,
        totalcupon: rpTotalcupon,
        remaining: rpRemaining,
        latestRound: rpLatestRound,
        progress: Number(rpProgress.toFixed(2))
      };
    }

    return res.status(200).json({
      success: true,
      product,
      stats: {
        sold,
        totalcupon,
        remaining,
        latestRound,
        progress: Number(progress.toFixed(2))
      },
      relatedProducts
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// READ ALL
// router.get("/", async (_, res) => {
//   const products = await Product.find().sort({ createdAt: -1 });
//   res.json(products);
// });

// router.get("/", async (_, res) => {
//   try {
//     const products = await Product.find()
//       .sort({ createdAt: -1 })
//       .lean();

//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error" });
//   }
// });

// router.get("/", async (req, res) => {
//   try {
//     res.writeHead(200, {
//       "Content-Type": "application/json",
//       "Transfer-Encoding": "chunked",
//     });

//     res.write("["); // start JSON array

//     const cursor = Product.find()
//       .sort({ createdAt: -1 })
//       .lean()
//       .cursor();

//     let first = true;

//     for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
//       if (!first) res.write(",");
//       first = false;

//       res.write(JSON.stringify(doc)); // send single product chunk
//     }

//     res.write("]"); // end JSON array
//     res.end();
//   } catch (err) {
//     res.status(500).json({ message: "Server Error" });
//   }
// });



router.get("/", async (req, res) => {
  try {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    });

    res.write("["); 
    let first = true;

    const cursor = Product.find().sort({ createdAt: -1 }).lean().cursor();

    for (let product = await cursor.next(); product != null; product = await cursor.next()) {
      if (!first) res.write(",");
      first = false;

      // 🔥 Fetch coupon list for this product
      const coupons = await CouponPurchase.find({ productId: product._id }).lean();

      // 🔥 Latest round calculation
      const latestRound = coupons.length
        ? Math.max(...coupons.map(c => c.round || 1))
        : 1;

      // 🔥 Sold count in latest round
      let sold = coupons.filter(c => c.round === latestRound).length;

      const totalcupon = product.totalcupon || 0;

      // 🔄 Sold reset if full
      if (sold >= totalcupon) sold = 0;

      const remaining = Math.max(totalcupon - sold, 0);
      const progress = totalcupon > 0 ? (sold / totalcupon) * 100 : 0;

      const responseDoc = {
        ...product,
        stats: {
          sold,
          totalcupon,
          remaining,
          latestRound,
          progress: Number(progress.toFixed(2)),
        },
      };

      res.write(JSON.stringify(responseDoc));
    }

    res.write("]");
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});




// mobile childcatgeory set 
router.get("/mobilechildcategoryset", async (req, res) => {
  try {
    const { category, subcategory, child } = req.query;

    const filter = {};
    if (category) filter.categoryName = category;
    if (subcategory) filter.subcategoryName = subcategory;
    if (child) {
      // 🔹 match only first 2 words of childcategoryName
      const childRegex = new RegExp("^" + child.split(" ").slice(0, 2).join(" "), "i");
      filter.childcategoryName = childRegex;
    }

    // 🔹 Fetch all matching products
    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();

    // 🔹 Add coupon stats
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        const coupons = await CouponPurchase.find({ productId: product._id }).lean();

        const latestRound = coupons.length
          ? Math.max(...coupons.map(c => c.round || 1))
          : 1;

        let sold = coupons.filter(c => c.round === latestRound)
                          .reduce((sum, c) => sum + (c.quantity || 0), 0);

        const totalcupon = product.totalcupon || 0;
        if (sold >= totalcupon) sold = totalcupon;

        const remaining = Math.max(totalcupon - sold, 0);
        const progress = totalcupon > 0 ? (sold / totalcupon) * 100 : 0;

        return {
          ...product,
          stats: {
            sold,
            totalcupon,
            remaining,
            latestRound,
            progress: Number(progress.toFixed(2)),
          },
        };
      })
    );

    res.status(200).json(productsWithStats);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});
// navbar filtering 
// routes/products.js
router.get("/filterapidata", async (req, res) => {
  try {
    // 🔹 Fast response with JSON stream
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    });

    res.write("[");
    let first = true;

    // 🔹 Only fetch required fields
    const cursor = Product.find()
      .sort({ createdAt: -1 })
      .select("title categoryName categoryImg subcategoryName subcategoryImg childcategoryName childcategoryImg brandName brandImg createdAt")
      .lean()
      .cursor();

    for (let product = await cursor.next(); product != null; product = await cursor.next()) {
      if (!first) res.write(",");
      first = false;

      // 🔹 Construct response
      const responseDoc = {
        _id: product._id,
        title: product.title,
        categoryName: product.categoryName,
        categoryImg: product.categoryImg,
        subcategoryName: product.subcategoryName,
        subcategoryImg: product.subcategoryImg,
        childcategoryName: product.childcategoryName,
        childcategoryImg: product.childcategoryImg,
        brandName: product.brandName,
        brandImg: product.brandImg,
        createdAt: product.createdAt,
      };

      res.write(JSON.stringify(responseDoc));
    }

    res.write("]");
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});


// router.get("/productsdata", async (req, res) => {
//   try {
//     const {
//       category,
//       subcategory,
//       child,
//       page = 1,
//       limit = 20,
//     } = req.query;

//     const filter = {};

//     if (category) filter.categoryName = category;
//     if (subcategory) filter.subcategoryName = subcategory;
//     if (child) filter.childcategoryName = child;

//     const skip = (page - 1) * limit;

//     const products = await Product.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit))
//       .lean();

//     const total = await Product.countDocuments(filter);

//     res.json({
//       products,
//       pagination: {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         totalPages: Math.ceil(total / limit)
//       }
//     });

//   } catch (err) {
//     res.status(500).json({ message: "Server Error" });
//   }
// });

// router.get("/productsdata", async (req, res) => {
//   try {
//     const { category, subcategory, child,brand, page = 1, limit = 20 } = req.query;

//     const filter = {};
//     if (category) filter.categoryName = category;
//     if (subcategory) filter.subcategoryName = subcategory;
//     if (child) {
//       // child slug → normal text
//       const childText = child
//         .replace(/-/g, " ")
//         .replace(/\b\w/g, c => c.toUpperCase())
//         .trim();

//       // first 2 words only
//       const firstTwoWords = childText.split(" ").slice(0, 2).join(" ");

//       filter.childcategoryName = {
//         $regex: `^${firstTwoWords}`, // start with first 2 words
//         $options: "i" // case insensitive
//       };
//     }

//      if (brand) {
//       const brandText = brand
//         .replace(/-/g, " ")
//         .trim();
//       filter.brandName = {
//         $regex: `^${brandText}$`, // exact match, case-insensitive
//         $options: "i"
//       };
//     }
//     const skip = (page - 1) * limit;

//     // 🔹 Fetch paginated products
//     const products = await Product.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit))
//       .lean();

//     // 🔹 Fetch total count for pagination
//     const total = await Product.countDocuments(filter);

//     // 🔹 Add coupon stats for each product
//     const productsWithStats = await Promise.all(
//       products.map(async (product) => {
//         const coupons = await CouponPurchase.find({ productId: product._id }).lean();

//         // Latest round
//         const latestRound = coupons.length
//           ? Math.max(...coupons.map(c => c.round || 1))
//           : 1;

//         // Sold in latest round
//         let sold = coupons.filter(c => c.round === latestRound)
//                           .reduce((sum, c) => sum + (c.quantity || 0), 0);

//         const totalcupon = product.totalcupon || 0;

//         // Sold reset if full
//         if (sold >= totalcupon) sold = totalcupon;

//         const remaining = Math.max(totalcupon - sold, 0);
//         const progress = totalcupon > 0 ? (sold / totalcupon) * 100 : 0;

//         return {
//           ...product,
//           stats: {
//             sold,
//             totalcupon,
//             remaining,
//             latestRound,
//             progress: Number(progress.toFixed(2)),
//           },
//         };
//       })
//     );

//     res.json({
//       products: productsWithStats,
//       pagination: {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         totalPages: Math.ceil(total / limit),
//       },
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server Error" });
//   }
// });


router.get("/productsdata", async (req, res) => {
  try {
    const { category, subcategory, child,brand,title, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.categoryName = category;
    if (subcategory) filter.subcategoryName = subcategory;
    if (child) {
      // child slug → normal text
      const childText = child
        .replace(/-/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();

      // first 2 words only
      const firstTwoWords = childText.split(" ").slice(0, 2).join(" ");

      filter.childcategoryName = {
        $regex: `^${firstTwoWords}`, // start with first 2 words
        $options: "i" // case insensitive
      };
    }

     if (brand) {
      const brandText = brand
        .replace(/-/g, " ")
        .trim();
     filter.brandName = {
  $regex: brandText,
  $options: "i"
};

    }

    // ✅ TITLE (⭐ NEW)
// ✅ TITLE (2+ words partial match)
if (title) {
  const titleText = title
    .replace(/-/g, " ")
    .trim();

  // split into words
  const words = titleText.split(" ").filter(Boolean); // ignore empty

  // at least 1 word match (OR condition)
  filter.title = {
    $regex: words.join("|"), // e.g. "Samsung|Galaxy"
    $options: "i",
  };
}

    const skip = (page - 1) * limit;

    // 🔹 Fetch paginated products
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // 🔹 Fetch total count for pagination
    const total = await Product.countDocuments(filter);

    // 🔹 Add coupon stats for each product
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        const coupons = await CouponPurchase.find({ productId: product._id }).lean();

        // Latest round
        const latestRound = coupons.length
          ? Math.max(...coupons.map(c => c.round || 1))
          : 1;

        // Sold in latest round
        let sold = coupons.filter(c => c.round === latestRound)
                          .reduce((sum, c) => sum + (c.quantity || 0), 0);

        const totalcupon = product.totalcupon || 0;

        // Sold reset if full
        if (sold >= totalcupon) sold = totalcupon;

        const remaining = Math.max(totalcupon - sold, 0);
        const progress = totalcupon > 0 ? (sold / totalcupon) * 100 : 0;

        return {
          ...product,
          stats: {
            sold,
            totalcupon,
            remaining,
            latestRound,
            progress: Number(progress.toFixed(2)),
          },
        };
      })
    );

    res.json({
      products: productsWithStats,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/latestproduct", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 16;
    const skip = (page - 1) * limit;

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    });

    res.write("[");
    let first = true;

    const cursor = Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .cursor();

    for (
      let product = await cursor.next();
      product != null;
      product = await cursor.next()
    ) {
      if (!first) res.write(",");
      first = false;

      const coupons = await CouponPurchase.find({
        productId: product._id,
      }).lean();

      const latestRound = coupons.length
        ? Math.max(...coupons.map((c) => c.round || 1))
        : 1;

      let sold = coupons.filter((c) => c.round === latestRound).length;
      const totalcupon = product.totalcupon || 0;

      if (sold >= totalcupon) sold = 0;

      const remaining = Math.max(totalcupon - sold, 0);
      const progress = totalcupon
        ? Number(((sold / totalcupon) * 100).toFixed(2))
        : 0;

      res.write(
        JSON.stringify({
          ...product,
          stats: {
            sold,
            totalcupon,
            remaining,
            latestRound,
            progress,
          },
        })
      );
    }

    res.write("]");
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/topsellings", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2; // 🔥 default 40
    const skip = (page - 1) * limit;

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    });

    res.write("[");
    let first = true;

    const cursor = Product.find({ type: "topselling" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .cursor();

    for (
      let product = await cursor.next();
      product != null;
      product = await cursor.next()
    ) {
      if (!first) res.write(",");
      first = false;

      const coupons = await CouponPurchase.find({
        productId: product._id,
      }).lean();

      const latestRound = coupons.length
        ? Math.max(...coupons.map((c) => c.round || 1))
        : 1;

      let sold = coupons.filter(
        (c) => c.round === latestRound
      ).length;

      const totalcupon = product.totalcupon || 0;
      if (sold >= totalcupon) sold = 0;

      const remaining = Math.max(totalcupon - sold, 0);
      const progress = totalcupon
        ? Number(((sold / totalcupon) * 100).toFixed(2))
        : 0;

      res.write(
        JSON.stringify({
          ...product,
          stats: {
            sold,
            totalcupon,
            remaining,
            latestRound,
            progress,
          },
        })
      );
    }

    res.write("]");
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});



router.get("/related/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    // 1️⃣ Current product
    const currentProduct = await Product.findById(id).lean();
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2️⃣ Related products
    const relatedProducts = await Product.find({
      _id: { $ne: id }, // exclude current product
      $or: [
        { categoryName: currentProduct.categoryName },
        { subcategoryName: currentProduct.subcategoryName },
        { childcategoryName: currentProduct.childcategoryName },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(relatedProducts);
  } catch (err) {
    console.error("Related product error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/premium", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // 🔥 default 40
    const skip = (page - 1) * limit;

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    });

    res.write("[");
    let first = true;

    const cursor = Product.find({ type: "premium" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .cursor();

    for (
      let product = await cursor.next();
      product != null;
      product = await cursor.next()
    ) {
      if (!first) res.write(",");
      first = false;

      const coupons = await CouponPurchase.find({
        productId: product._id,
      }).lean();

      const latestRound = coupons.length
        ? Math.max(...coupons.map((c) => c.round || 1))
        : 1;

      let sold = coupons.filter(
        (c) => c.round === latestRound
      ).length;

      const totalcupon = product.totalcupon || 0;
      if (sold >= totalcupon) sold = 0;

      const remaining = Math.max(totalcupon - sold, 0);
      const progress = totalcupon
        ? Number(((sold / totalcupon) * 100).toFixed(2))
        : 0;

      res.write(
        JSON.stringify({
          ...product,
          stats: {
            sold,
            totalcupon,
            remaining,
            latestRound,
            progress,
          },
        })
      );
    }

    res.write("]");
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});


router.get("/deals", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 80; // 🔥 default 40
    const skip = (page - 1) * limit;

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    });

    res.write("[");
    let first = true;

    const cursor = Product.find({ type: "deals" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .cursor();

    for (
      let product = await cursor.next();
      product != null;
      product = await cursor.next()
    ) {
      if (!first) res.write(",");
      first = false;

      const coupons = await CouponPurchase.find({
        productId: product._id,
      }).lean();

      const latestRound = coupons.length
        ? Math.max(...coupons.map((c) => c.round || 1))
        : 1;

      let sold = coupons.filter(
        (c) => c.round === latestRound
      ).length;

      const totalcupon = product.totalcupon || 0;
      if (sold >= totalcupon) sold = 0;

      const remaining = Math.max(totalcupon - sold, 0);
      const progress = totalcupon
        ? Number(((sold / totalcupon) * 100).toFixed(2))
        : 0;

      res.write(
        JSON.stringify({
          ...product,
          stats: {
            sold,
            totalcupon,
            remaining,
            latestRound,
            progress,
          },
        })
      );
    }

    res.write("]");
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});


// router.get("/", async (req, res) => {
//   try {
//     res.writeHead(200, {
//       "Content-Type": "application/json",
//       "Transfer-Encoding": "chunked",
//     });

//     res.write("[");
//     let first = true;
//     const BATCH_SIZE = 50;

//     const cursor = Product.find()
//       .sort({ createdAt: -1 })
//       .lean()
//       .cursor();

//     let batch = [];

//     for (
//       let product = await cursor.next();
//       product != null;
//       product = await cursor.next()
//     ) {
//       batch.push(product);

//       if (batch.length === BATCH_SIZE) {
//         await sendBatch(batch);
//         batch = [];
//       }
//     }

//     // remaining data
//     if (batch.length > 0) {
//       await sendBatch(batch);
//     }

//     res.write("]");
//     res.end();

//     // 🔥 helper
//     async function sendBatch(products) {
//       const productIds = products.map(p => p._id);

//       const coupons = await CouponPurchase.find({
//         productId: { $in: productIds },
//       }).lean();

//       for (const product of products) {
//         if (!first) res.write(",");
//         first = false;

//         const productCoupons = coupons.filter(
//           c => String(c.productId) === String(product._id)
//         );

//         const latestRound = productCoupons.length
//           ? Math.max(...productCoupons.map(c => c.round || 1))
//           : 1;

//         let sold = productCoupons.filter(
//           c => c.round === latestRound
//         ).length;

//         const totalcupon = product.totalcupon || 0;
//         if (sold >= totalcupon) sold = 0;

//         const remaining = Math.max(totalcupon - sold, 0);
//         const progress =
//           totalcupon > 0 ? (sold / totalcupon) * 100 : 0;

//         const responseDoc = {
//           ...product,
//           stats: {
//             sold,
//             totalcupon,
//             remaining,
//             latestRound,
//             progress: Number(progress.toFixed(2)),
//           },
//         };

//         res.write(JSON.stringify(responseDoc));
//       }

//       // 🔥 small delay → smoother UX
//       await new Promise(r => setTimeout(r, 20));
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).end();
//   }
// });






router.get("/all", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    const coupons = await CouponPurchase.find().lean(); // all coupon purchases

    // 🔥 Combine stats inside products
    const finalData = products.map(product => {
      const relevantCoupons = coupons.filter(c => c.productId === String(product._id));

      // Get latest round
      const latestRound = relevantCoupons.length
        ? Math.max(...relevantCoupons.map(c => c.round || 1))
        : 1;

      // Calculate sold in latest round
      const sold = relevantCoupons
        .filter(c => c.round === latestRound)
        .reduce((sum, c) => sum + (c.quantity || 0), 0);

      const totalcupon = product.totalcupon || 0;
      const remaining = Math.max(totalcupon - sold, 0);

      return {
        ...product,
        totalcupon,
        sold,
        remaining,
        latestRound,
        couponDetails: relevantCoupons, // full matching coupons (optional)
      };
    });

    return res.status(200).json({ success: true, products: finalData });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// router.get("/", async (req, res) => {
//   try {
//     res.writeHead(200, {
//       "Content-Type": "application/json",
//       "Transfer-Encoding": "chunked",
//     });

//     res.write("["); // start JSON array

//     const cursor = Product.find()
//       .sort({ createdAt: -1 })
//       .lean()
//       .cursor();

//     const BATCH_SIZE = 50;
//     let batch = [];
//     let firstChunk = true;

//     for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
//       batch.push(doc);

//       if (batch.length === BATCH_SIZE) {
//         if (!firstChunk) res.write(",");
//         firstChunk = false;

//         res.write(JSON.stringify(batch)); // send 50 items at once
//         batch = [];
//       }
//     }

//     // last batch (if remaining)
//     if (batch.length > 0) {
//       if (!firstChunk) res.write(",");
//       res.write(JSON.stringify(batch));
//     }

//     res.write("]"); // end JSON array
//     res.end();
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server Error" });
//   }
// });






// 🔍 Product Search API (category/subcategory/childcategory অনুযায়ী)
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase().trim();
    if (!query) {
      return res.status(200).json([]);
    }

    // সব product একবারে না এনে DB তেই filter করবো
    const products = await Product.find({
      $or: [
        { categoryName: { $regex: query, $options: "i" } },
        { subcategoryName: { $regex: query, $options: "i" } },
        { childcategoryName: { $regex: query, $options: "i" } },
      ],
    }).limit(30);

    // suggestion structure বানানো
    const matched = [];

    products.forEach((product) => {
      if (
        product.categoryName &&
        product.categoryName.toLowerCase().includes(query)
      ) {
        matched.push({
          type: "Category",
          label: product.categoryName,
          link: `/category/${encodeURIComponent(product.categoryName)}`,
          image: product.categoryImg,
        });
      }

      if (
        product.subcategoryName &&
        product.subcategoryName.toLowerCase().includes(query)
      ) {
        matched.push({
          type: "Subcategory",
          label: product.subcategoryName,
          link: `/category/${encodeURIComponent(
            product.categoryName
          )}/${encodeURIComponent(product.subcategoryName)}`,
          image: product.subcategoryImg,
        });
      }

      if (
        product.childcategoryName &&
        product.childcategoryName.toLowerCase().includes(query)
      ) {
        matched.push({
          type: "Childcategory",
          label: product.childcategoryName,
          link: `/category/${encodeURIComponent(
            product.categoryName
          )}/${encodeURIComponent(
            product.subcategoryName
          )}/${encodeURIComponent(product.childcategoryName)}`,
          image: product.childcategoryImg,
        });
      }
    });

    // duplicate সরানো
    const unique = Array.from(new Map(matched.map((m) => [m.label, m])).values());

    res.status(200).json(unique.slice(0, 10));
  } catch (err) {
    console.error("Error searching products:", err);
    res.status(500).json({ error: "Server error" });
  }
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
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.get("/slug/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


// router.get("/slug/:slug", async (req, res) => {
//   try {
//     const requestedSlug = req.params.slug.toLowerCase();

//     // 1️⃣ Fetch all products (or optionally use a faster query)
//     const products = await Product.find().lean();

//     // 2️⃣ Find product by slugified title
//     const product = products.find(p => {
//       const pSlug = slugify(p.title, { lower: true, strict: true });
//       return pSlug === requestedSlug;
//     });

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     res.json(product);
//   } catch (error) {
//     console.error("Server error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });




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



const uploads = multer({ storage: multer.memoryStorage() });
const IMGBB_KEY = "746adaf1da9a1a48b000bec014639aeb";

router.post("/:id/reviewmobile", uploads.array("photos", 6), async (req, res) => {
  try {
    const { userAuth, rating, comment } = req.body;
    const files = req.files || [];
    const uploadedUrls = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("image", file.buffer.toString("base64"));

      const imgbbRes = await axios.post(
        `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
        formData,
        { headers: formData.getHeaders() }
      );

      uploadedUrls.push(imgbbRes.data.data.url);
    }

    const newReview = {
      userAuth,
      rating: Number(rating),
      comment,
      photos: uploadedUrls,
      date: new Date(),
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: newReview } },
      { new: true }
    );

    res.json({ message: "Review added successfully", product: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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

// CATEGORY-WISE DISCOUNT UPDATE
// PUT /updatediscount/category-discount
router.put("/updatediscount/category-discount", async (req, res) => {
  const { categoryName, discount } = req.body;

  if (!categoryName || discount == null) {
    return res.status(400).json({ error: "Category and discount required" });
  }

  try {
    // Find all products in this category
    const products = await Product.find({ categoryName });

    // Update each product: discount + calculated ProductPrice
    const updatePromises = products.map((p) => {
      const oldPrice = parseFloat(p.oldPrice || 0);
      const discountValue = parseFloat(discount);

      const newProductPrice = oldPrice - (oldPrice * discountValue) / 100;

      return Product.updateOne(
        { _id: p._id },
        {
          $set: {
            discount: discountValue.toString(),
            ProductPrice: newProductPrice.toFixed(2), // 2 decimal places
          },
        }
      );
    });

    await Promise.all(updatePromises);

    res.json({ message: `Discount and ProductPrice updated for ${categoryName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});




// prpmocdeo 

// ============================
// 1️⃣ Category-wise promo
// ============================
// ---------------- Category-wise promo
router.put("/updatepromo/category", async (req, res) => {
  const { categoryName, promoCode, promoType, promoValue, promoStartDate, promoEndDate } = req.body;

  if (!categoryName || !promoCode || !promoType || promoValue == null || !promoStartDate || !promoEndDate)
    return res.status(400).json({ error: "All fields required" });

  try {
    const products = await Product.find({ categoryName: categoryName.trim() });
    if (!products.length) return res.status(404).json({ error: "No products found" });

    await Promise.all(
      products.map((p) =>
        Product.updateOne(
          { _id: p._id },
          {
            $set: {
              promoCode,
              promoType,
              promoValue: Number(promoValue),
              promoStartDate,
              promoEndDate,
            },
          }
        )
      )
    );

    res.json({ message: `Promo updated for ${products.length} products`, updatedCount: products.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- All products promo
router.put("/updatepromo/all", async (req, res) => {
  const { allProductPromoCode, allProductPromoType, allProductPromoValue, allProductPromoStartDate, allProductPromoEndDate } = req.body;

  if (!allProductPromoCode || !allProductPromoType || allProductPromoValue == null || !allProductPromoStartDate || !allProductPromoEndDate)
    return res.status(400).json({ error: "All fields required" });

  try {
    const products = await Product.find();
    if (!products.length) return res.status(404).json({ error: "No products found" });

    await Promise.all(
      products.map((p) =>
        Product.updateOne(
          { _id: p._id },
          {
            $set: {
              allProductPromoCode,
              allProductPromoType,
              allProductPromoValue: Number(allProductPromoValue),
              allProductPromoStartDate,
              allProductPromoEndDate,
            },
          }
        )
      )
    );

    res.json({ message: `All-products promo applied to ${products.length} products`, updatedCount: products.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});





export default router;
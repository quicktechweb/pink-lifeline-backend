// routes/categoryBannerRoutes.js
import express from "express";
import { getBanners, updateProductInBanner } from "../controllers/categoryBannerController.js";

const router = express.Router();

router.get("/", getBanners);

// Must match frontend pattern exactly
router.put("/:bannerId/card/:cardId/item/:itemId", updateProductInBanner);

export default router;

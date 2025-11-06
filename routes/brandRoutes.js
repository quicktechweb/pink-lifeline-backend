import express from "express";
import { getBrands, addBrand, updateBrand, deleteBrand } from "../controllers/brandController.js";

const router = express.Router();

router.get("/", getBrands);
router.post("/", addBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;

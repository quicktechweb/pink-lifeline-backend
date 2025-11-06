import express from "express";
import {
  createSubcategory,
  getSubcategories,
  updateSubcategory,
  deleteSubcategory,
} from "../controllers/subcategoryController.js";

const router = express.Router();

router.post("/", createSubcategory);
router.get("/", getSubcategories);
router.put("/:id", updateSubcategory);
router.delete("/:id", deleteSubcategory);

export default router;

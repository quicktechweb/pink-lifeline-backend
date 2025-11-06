// routes/childCategoryRoutes.js
import express from "express";
import {
  createChildCategory,
  getChildCategories,
  updateChildCategory,
  deleteChildCategory,
} from "../controllers/childCategoryController.js";

const router = express.Router();

router.post("/", createChildCategory);
router.get("/", getChildCategories);
router.put("/:id", updateChildCategory);
router.delete("/:id", deleteChildCategory);

export default router;

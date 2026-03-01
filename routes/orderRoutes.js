import express from "express";
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderById,
  createBkashPayment,
  bkashCallbackHandler,
  createCODOrder,
  getMyOrders,
  getBkashPaymentStatus,
  walletPayController,
  walletmobilePayController,
  updateOrderConsignment,
  updateBulkConsignment,
  deleteOrders
} from "../controllers/orderController.js";


const router = express.Router();
router.post("/orders/cod", createCODOrder);
router.post("/orders", createOrder);
router.get("/orders", getOrders);
router.put("/orders/:id/status", updateOrderStatus); // Update status
router.delete("/orders/:id", deleteOrder); // Delete order
router.delete("/ordersdata/:id", deleteOrders); // Delete order
router.get("/orders/:id", getOrderById); // single id invoice 
router.get("/my-orders", getMyOrders); // myorder

// PUT /api/orders/:id
router.put("/update-consignment/:id", updateOrderConsignment);

// Update multiple orders bulk
router.put("/bulk-consignment", updateBulkConsignment);

router.post("/orders/wallet-pay", walletPayController);
router.post("/orders/wallet-pays", walletmobilePayController);

router.get("/orders/bkash/status/:paymentID", getBkashPaymentStatus);


// Bkash payment routes
router.post("/orders/bkash/create", createBkashPayment); // create payment
router.get("/orders/bkash/callback", bkashCallbackHandler); // callback from Bkash

export default router;

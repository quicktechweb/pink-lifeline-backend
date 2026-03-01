import Order from "../models/Order.js";
import UserData from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const BKASH_BASE_URL = process.env.BKASH_BASE_URL;
const APP_KEY = process.env.BKASH_APP_KEY;
const APP_SECRET = process.env.BKASH_APP_SECRET;
const USERNAME = process.env.BKASH_USERNAME;
const PASSWORD = process.env.BKASH_PASSWORD;


const pendingPayments = {};

// Get bKash token
export const getBkashToken = async () => {
  const res = await axios.post(
    `${BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    { app_key: APP_KEY, app_secret: APP_SECRET },
    { headers: { username: USERNAME, password: PASSWORD, "Content-Type": "application/json" } }
  );
  return res.data.id_token;
};

// Create Bkash Payment
export const createBkashPayment = async (req, res) => {
  try {
    const { amount, userPhone, customer, products, totals, userAuth, isSandbox = true } = req.body;

    const idToken = await getBkashToken();

    // Build request body
    const requestBody = {
      mode: "0011",
      callbackURL: `https://serverluckyshop.luckyshop.com.bd/api/orders/bkash/callback`,
      amount: amount.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: "INV-" + Date.now(),
    };

    // Handle payerReference
    if (isSandbox) {
      requestBody.payerReference = " "; // single space looks empty in sandbox
    } else if (userPhone) {
      requestBody.payerReference = userPhone; // live: only if userPhone exists
    }

    const createRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/create`,
      requestBody,
      { headers: { authorization: idToken, "x-app-key": APP_KEY, "Content-Type": "application/json" } }
    );

    const { paymentID, bkashURL } = createRes.data;

    pendingPayments[paymentID] = { customer, products, totals, userAuth, idToken, amount };

    res.json({ success: true, paymentID, bkashURL });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data || err.message });
  }
};

// Bkash Callback
export const bkashCallbackHandler = async (req, res) => {
  try {
    const { paymentID } = req.query;
    const orderData = pendingPayments[paymentID];
    if (!orderData) return res.send("Order data missing!");

    // Execute payment
    const execRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      { headers: { authorization: orderData.idToken, "x-app-key": APP_KEY, "Content-Type": "application/json" } }
    );

    if (execRes.data.transactionStatus !== "Completed")
      return res.send("Payment not completed!");

    // Save order in DB
    const newOrder = new Order({
      customer: orderData.customer,
      products: orderData.products,
      totals: orderData.totals,
      status: "pending",
      orderPayment: "paid",
      paymentMethod: "bKash",
      paymentInfo: {
        trxID: execRes.data.trxID,
        amount: execRes.data.amount,
        phone: orderData.customer.phone,
        date: new Date(),
      },
      userAuth: orderData.userAuth,
    });

    const savedOrder = await newOrder.save();
    delete pendingPayments[paymentID];

    // 🔹 Redirect to frontend with query params
    res.redirect(`https://luckyshop.com.bd/payment-success?paymentID=${execRes.data.trxID}&orderID=${savedOrder._id}`);
  } catch (err) {
    console.error(err);
    res.send("Payment failed!");
  }
};





// Cash on Delivery Order
export const createCODOrder = async (req, res) => {
  try {
    const { customer, products, totals, userAuth } = req.body;

    const newOrder = new Order({
      customer,
      products,
      totals,
      orderPayment: "unpaid",
      status: "pending",
      paymentMethod: "Cash on Delivery",
      userAuth,
      date: new Date(),
    });

    const savedOrder = await newOrder.save();
    res.json({ success: true, order: savedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
};


 export const walletPayController = async (req, res) => {
  try {
    const { customer, products, totals, amount, auth } = req.body;

    console.log("Received Wallet Pay Request:");
    console.log("Customer:", customer);
    console.log("Products:", products);
    console.log("Totals:", totals);
    console.log("Amount:", amount);
    console.log("Auth:", auth);

    let user;

    // Detect if auth is phoneNumber or email
    if (!isNaN(auth)) {
      console.log("Auth detected as Phone Number");
      user = await UserData.findOne({ phoneNumber: auth });
    } else {
      console.log("Auth detected as Email");
      user = await UserData.findOne({ email: auth });
    }

    if (!user) {
      console.log("❌ User not found!");
      return res.json({ success: false, message: "User not found" });
    }

    console.log("User Found:", user.email || user.phoneNumber);
    console.log("Wallet Before:", user.walletBalance);

    // Check balance
    if (user.walletBalance < amount) {
      console.log("❌ Insufficient Wallet Balance");
      return res.json({
        success: false,
        message: "Insufficient Wallet Balance",
      });
    }

    // Wallet calculation
    const walletBefore = user.walletBalance;
    const walletAfter = walletBefore - amount;

    // Update wallet balance
    user.walletBalance = walletAfter;
    await user.save();

    console.log("Wallet After:", walletAfter);
    console.log("Wallet Balance Updated Successfully!");

    // Create order
    const newOrder = await Order.create({
      customer,
      products,
      totals,
      paymentMethod: "wallet",
      orderPayment: "unpaid",
      status: "pending",
      userAuth: auth,
      paymentInfo: {
        amount,
        date: new Date(),
        walletBefore: walletBefore,
        walletAfter: walletAfter,
      },
    });

    console.log("Order Created Successfully:", newOrder._id);

    res.json({
      success: true,
      message: "Wallet payment successful",
      order: newOrder,
      updatedWalletBalance: walletAfter,
    });

  } catch (err) {
    console.error("Wallet Pay Error:", err);
    res.json({
      success: false,
      message: "Something went wrong",
    });
  }
};





// mobile wallrtpay 
export const walletmobilePayController = async (req, res) => {
  try {
    console.log("---- Incoming WALLET ORDER ----");
    console.log("BODY:", req.body);

    const { auth, cartItems, products, customer, totalAmount } = req.body;

    // FIX: Accept both cartItems or products
    const items = cartItems || products;
    console.log("ITEMS RECEIVED:", items);

    if (!auth) {
      console.log("❌ No auth");
      return res.json({ success:false, message:"Auth required" });
    }

    const user = await UserData.findOne({
      $or: [{ phoneNumber: auth }, { email: auth }]
    });

    console.log("FOUND USER:", user);

    if (!user)
      return res.json({ success:false, message:"User not found" });

    if (user.walletBalance < totalAmount) {
      console.log("❌ Insufficient balance");
      return res.json({
        success:false,
        message:"Insufficient wallet balance",
        walletBalance:user.walletBalance
      });
    }

    const beforeBalance = user.walletBalance;
    user.walletBalance -= totalAmount;
    await user.save();
    console.log("Wallet updated:", beforeBalance, "→", user.walletBalance);

    // FIXED PRODUCT MAPPING
    const formattedProducts = items.map(item => ({
      productId: item.productId,
      title: item.title,
      img: item.img,
      price: item.ProductPrice || item.price,
      quantity: item.quantity,
      subtotal: (item.ProductPrice || item.price) * item.quantity,
      selectedSize: item.selectedSize || null,
      selectedColor: item.selectedColor || null
    }));

    console.log("FORMATTED PRODUCTS:", formattedProducts);

    const order = await Order.create({
      customer,
      products: formattedProducts,
      totals: {
        quantity: formattedProducts.reduce((n, p) => n + p.quantity, 0),
        subtotal: formattedProducts.reduce((n, p) => n + p.subtotal, 0),
        shipping: 0,
        grandtotal: totalAmount
      },
      paymentMethod: "wallet",
      orderPayment: "unpaid",
      status: "pending",
      statusHistory: ["pending"],
      userAuth: auth,
      paymentInfo: {
        method:"wallet",
        before:beforeBalance,
        after:user.walletBalance,
        amount:totalAmount,
        date:new Date()
      }
    });

    console.log("ORDER CREATED:", order);

    return res.json({
      success: true,
      message: "Order placed successfully via wallet",
      order,
      newBalance: user.walletBalance
    });

  } catch (err) {
    console.log("❌ WALLET ORDER ERROR:", err);
    return res.json({ success:false, message:"Server error", error:String(err) });
  }
};










// Create new order
export const createOrder = async (req, res) => {
  try {
    const { customer, products, totals, status,userAuth } = req.body;

    if (!customer || !products || products.length === 0) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // Default status to "pending" if not provided
    const newOrder = new Order({ customer, products, totals, status: status || "pending",userAuth });
    const savedOrder = await newOrder.save();

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all orders (optional, for admin)
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 🔹 Single Order Consignment Update
export const updateOrderConsignment = async (req, res) => {
  try {
    const { consignment_id, tracking_code } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { consignment_id, tracking_code },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ message: "Single Order Updated", order });

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};



// 🔥 MULTIPLE Order Bulk Consignment Update
export const updateBulkConsignment = async (req, res) => {
  try {
    const { orders } = req.body; // [{id,consignment_id,tracking_code}]

    if (!orders?.length) return res.status(400).json({ message: "No orders given!" });

    const updateTasks = orders.map(o =>
      Order.findByIdAndUpdate(
        o.id,
        { consignment_id: o.consignment_id, tracking_code: o.tracking_code },
        { new: true }
      )
    );

    const updatedOrders = await Promise.all(updateTasks);

    res.json({
      message: "Bulk Consignment Updated Successfully 🎉",
      updatedOrders
    });

  } catch (err) {
    console.error("Bulk Update Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🧠 Ensure pending is always included at the beginning
    if (!order.statusHistory || order.statusHistory.length === 0) {
      order.statusHistory = [order.status || "pending"];
    }

    // 🧩 Add the new status only if it’s not the same as the last one
    const lastStatus = order.statusHistory[order.statusHistory.length - 1];
    if (lastStatus !== status) {
      order.statusHistory.push(status);
    }

    // ✅ Update the latest status
    order.status = status;

    await order.save();

    res.json({
      success: true,
      message: "Order status updated successfully",
      status: order.status,
      statusHistory: order.statusHistory,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get a single order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


// Delete order
export const deleteOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete order (user can only delete their own orders)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { userAuth } = req.query; // pass userAuth (email or phone) from frontend

    if (!userAuth) {
      return res.status(400).json({ message: "userAuth is required" });
    }

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if this order belongs to the user
    if (order.userAuth !== userAuth) {
      return res.status(403).json({ message: "You are not allowed to delete this order" });
    }

    // Delete order
    await Order.findByIdAndDelete(id);

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


// // Get orders of a specific user
// export const getMyOrders = async (req, res) => {
//   try {
//     const { userAuth } = req.query; // email বা phone frontend থেকে পাঠাবে

//     if (!userAuth) {
//       return res.status(400).json({ message: "userAuth is required" });
//     }

//     const myOrders = await Order.find({ userAuth }).sort({ createdAt: -1 });

//     res.json(myOrders);
//   } catch (error) {
//     console.error("Error fetching my orders:", error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };



const STEADFAST_URL = "https://portal.packzy.com/api/v1";
const API_KEY = "hcpm2ucs22epe7q0j4qqaqagqf2y4yx7";
const SECRET_KEY ="56onyth1a4rwfceproj6ao1o";
// const STEADFAST_URL = process.env.STEADFAST_URL;
// const API_KEY = process.env.API_KEY;
// const SECRET_KEY = process.env.SECRET_KEY;

// ⛳ Unified courier status function (backend version)
const getUnifiedStatus = async (invoice, tracking_code, consignment_id) => {
  try {
    // 1) Check by consignment_id
    if (consignment_id) {
      const res = await axios.get(`${STEADFAST_URL}/status_by_cid/${consignment_id}`, {
        headers: { "Api-Key": API_KEY, "Secret-Key": SECRET_KEY },
      });
      if (res.data?.delivery_status) return res.data.delivery_status;
    }

    // 2) Check by invoice
    if (invoice) {
      const res = await axios.get(`${STEADFAST_URL}/status_by_invoice/${invoice}`, {
        headers: { "Api-Key": API_KEY, "Secret-Key": SECRET_KEY },
      });
      if (res.data?.delivery_status) return res.data.delivery_status;
    }

    // 3) Check by tracking_code
    if (tracking_code) {
      const res = await axios.get(`${STEADFAST_URL}/status_by_trackingcode/${tracking_code}`, {
        headers: { "Api-Key": API_KEY, "Secret-Key": SECRET_KEY },
      });
      if (res.data?.delivery_status) return res.data.delivery_status;
    }

    return "pending"; // fallback
  } catch (err) {
    console.error("❌ Status fetch failed:", err.response?.data || err);
    return "pending";
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const { userAuth } = req.query;
    if (!userAuth) return res.status(400).json({ message: "userAuth is required" });

    const orders = await Order.find({ userAuth }).sort({ createdAt: -1 });

    // 📦 Add courier status to each order
    const fullOrders = await Promise.all(
      orders.map(async (order) => {
        const status = await getUnifiedStatus(
          `ORD-${order._id}`,
          order.tracking_code,
          order.consignment_id
        );

        return {
          ...order.toObject(),
          delivery_status: status || "pending",
        };
      })
    );

    return res.json(fullOrders);

  } catch (error) {
    console.error("Error fetching my orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
// orderController.js

// Check Bkash payment status
// Check Bkash payment status
export const getBkashPaymentStatus = async (req, res) => {
  try {
    const { paymentID } = req.params;

    // Check memory first
    let orderData = pendingPayments[paymentID];
    if (orderData) {
      return res.json({ orderPayment: "pending", message: "Payment still pending" });
    }

    // DB check: look for either trxID or paymentID
    const order = await Order.findOne({
      $or: [
        { "paymentInfo.trxID": paymentID },
        { "paymentInfo.paymentID": paymentID } // optional, if you store paymentID
      ]
    });

    if (!order) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({
      orderPayment: order.orderPayment, // 'paid'
      orderId: order._id,
      paymentInfo: order.paymentInfo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

import Order from "../models/Order.js";


import axios from "axios";

const BKASH_BASE_URL = "https://tokenized.pay.bka.sh/v1.2.0-beta";
const APP_KEY = "LGyJEehC0PlqQpQDFonuvggttc";
const APP_SECRET = "E8iXGDQwocrP1YCJMzUjddOXljv2OG8qnXAvDHQmWqEzoCNWBFpv";
const USERNAME = "01898932489";
const PASSWORD = "{KIbVP[Pf1[";

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
    const { amount, userPhone, customer, products, totals, userAuth } = req.body;

    const idToken = await getBkashToken();
    const payerReference = userPhone || "01711111111";

    const createRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        mode: "0011",
        payerReference,
        callbackURL: `http://localhost:5000/api/orders/bkash/callback`,
        amount: amount.toString(),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: "INV-" + Date.now(),
      },
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

    const execRes = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      { headers: { authorization: orderData.idToken, "x-app-key": APP_KEY, "Content-Type": "application/json" } }
    );

    if (execRes.data.transactionStatus !== "Completed")
      return res.send("Payment not completed!");

    const newOrder = new Order({
  customer: orderData.customer,
  products: orderData.products,
  totals: orderData.totals,
  status: "pending", // ✅ Bkash payment successful → paid
  orderPayment: "paid", // ✅ paid
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

    res.send(`
      <h2>Payment Successful ✅</h2>
      <p>Transaction ID: ${execRes.data.trxID}</p>
      <p>Amount Paid: ${execRes.data.amount} BDT</p>
      <p>Order ID: ${savedOrder._id}</p>
    `);
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
    });

    const savedOrder = await newOrder.save();
    res.json({ success: true, order: savedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Order creation failed" });
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
// export const deleteOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deletedOrder = await Order.findByIdAndDelete(id);

//     if (!deletedOrder) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.json({ message: "Order deleted successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

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


// Get orders of a specific user
export const getMyOrders = async (req, res) => {
  try {
    const { userAuth } = req.query; // email বা phone frontend থেকে পাঠাবে

    if (!userAuth) {
      return res.status(400).json({ message: "userAuth is required" });
    }

    const myOrders = await Order.find({ userAuth }).sort({ createdAt: -1 });

    res.json(myOrders);
  } catch (error) {
    console.error("Error fetching my orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    products: [
      {
        title: String,
        types: String,
        ProductPrice: Number,
        purchasePrice: Number,
        quantity: Number,
        img: String,
        selectedSize: { type: String, default: null },
        selectedColor: { type: String, default: null },
      },
    ],
    totals: {
      quantity: Number,
      subtotal: Number,
      tax: Number,
      shipping: Number,
      grandtotal: Number,
    },
    status: {
      type: String,
      default: "pending", // pending, paid, delivered, etc
    },
    orderPayment: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },
    statusHistory: {
      type: [String],
      default: ["pending"],
    },
    paymentId: {
      type: String,
      default: () => Math.floor(10000000 + Math.random() * 90000000).toString(), // 8 digit
      unique: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bKash", "Cash on Delivery"],
      required: true,
    },
    paymentInfo: {
      trxID: { type: String, default: null }, // Bkash transaction ID
      amount: { type: Number, default: null }, // Paid amount
      phone: { type: String, default: null },  // Bkash phone number
      date: { type: Date, default: null },
    },
    userAuth: { type: String, required: false },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);
export default Order;

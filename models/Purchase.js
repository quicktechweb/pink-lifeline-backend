import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema({
  product: { type: String, required: true },  // ✅ product title
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
});

const purchaseSchema = new mongoose.Schema(
  {
    supplier: { type: String, required: true }, // ✅ supplier name
    invoiceNo: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    items: [purchaseItemSchema],
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    dueAmount: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);



export default mongoose.model("Purchase", purchaseSchema);

import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema({
  headers: [String],
  rows: [[String]],
});

const CTASchema = new mongoose.Schema({
  text: String,
  url: String,
});

const SectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  table: TableSchema,
  cta: CTASchema,
});

const ShippingPolicySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, default: "termshipping001" },
    pageTitle: { type: String, default: "Shipping Policy" },
    subtitle: { type: String },
    backgroundImage: { type: String },
    sections: [SectionSchema],
  },
  { timestamps: true }
);

export default mongoose.model(
  "ShippingPolicy",
  ShippingPolicySchema,
  "shippingpolicy"
);

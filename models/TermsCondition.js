import mongoose from 'mongoose';

const SectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
});

const TermsConditionSchema = new mongoose.Schema(
  {
    pageTitle: { type: String, default: "Terms & Conditions" },
    subtitle: { type: String, default: "" },
    sections: [SectionSchema],
  },
  { timestamps: true }
);

export default mongoose.model("TermsCondition", TermsConditionSchema, "termscondition");

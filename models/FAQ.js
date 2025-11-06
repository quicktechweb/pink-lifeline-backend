import mongoose from 'mongoose';
const faqSchema = new mongoose.Schema(
  {
    header: {
      title: { type: String, required: true },
      subtitle: { type: String, required: true },
    },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("FAQ", faqSchema,"faq");

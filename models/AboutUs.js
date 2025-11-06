import mongoose from "mongoose";

const AboutUsSchema = new mongoose.Schema(
  {
    hero: {
      title: { type: String, required: true },
      description: { type: String, required: true },
      image: { type: String, required: true },
    },
    features: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String },
      },
    ],
    divider: {
      text: { type: String, required: true },
      faqLink: { type: String },
    },
    contact: {
      title: { type: String, required: true },
      subtitle: { type: String },
      methods: [
        {
          type: { type: String, required: true }, // 'call' or 'email'
          label: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
    },
  },
  { timestamps: true }
);

const AboutUs = mongoose.model("AboutUs", AboutUsSchema, "aboutus"); // use collection name "aboutus"
export default AboutUs;

import mongoose from 'mongoose';

const BannerSchema = new mongoose.Schema({
  textMain: { type: String, default: "" },
  textSub: { type: String, default: "" },
  image: { type: String, default: "" }
}, { _id: false });

const FormSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  options: { type: [String], default: [] },
  buttonText: { type: String, default: "" }
}, { _id: false });

const ContactUsSchema = new mongoose.Schema({
  pageTitle: { type: String, default: "Contact Us" },
  subtitle: { type: String, default: "For Any Further Questions." },
  backgroundImage: { type: String, default: "" },
  cards: {
    type: [
      {
        id: Number,
        title: String,
        icon: String,
        description: String,
        linkText: String,
        linkUrl: String,
        banner: BannerSchema,
        form: FormSchema,
        contactInfo: { type: Object, default: {} }
      }
    ],
    default: []
  },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("contactus", ContactUsSchema); // collection name 'contactus'

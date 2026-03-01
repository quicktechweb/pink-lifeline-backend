import Gtm from "../models/Gtm.js";

// Save or Update GTM ID
export const saveOrUpdateGtm = async (req, res) => {
  try {
    const { gtmId } = req.body;
    if (!gtmId) return res.status(400).json({ message: "GTM ID required" });

    let gtm = await Gtm.findOne();
    if (gtm) {
      gtm.gtmId = gtmId; // update
      await gtm.save();
    } else {
      gtm = await Gtm.create({ gtmId }); // create
    }

    res.status(200).json({ gtm, message: "GTM ID saved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get GTM ID
export const getGtm = async (req, res) => {
  try {
    const gtm = await Gtm.findOne();
    res.status(200).json(gtm || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
import Campaign from "../models/Campaign.js";

// Get all campaigns
export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add campaign
export const addCampaign = async (req, res) => {
  try {
    const { campaignName, status, campaignImg } = req.body;
    const newCampaign = new Campaign({ campaignName, status, campaignImg });
    const saved = await newCampaign.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update campaign
export const updateCampaign = async (req, res) => {
  try {
    const updated = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete campaign
export const deleteCampaign = async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Campaign deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

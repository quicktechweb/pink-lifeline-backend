// controllers/categoryBannerController.js
import CategoryBanner from "../models/CategoryBanner.js";

/**
 * GET /api/categoryBanner
 */
export const getBanners = async (req, res) => {
  try {
    console.log("🔍 GET /api/categoryBanner - fetching all banners");
    const banners = await CategoryBanner.find();
    console.log(`🔔 fetched ${banners.length} banners`);
    return res.json(banners);
  } catch (err) {
    console.error("❌ getBanners error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/categoryBanner/:bannerId/card/:cardId/item/:itemId
 * body: { img?, title? }
 */
export const updateProductInBanner = async (req, res) => {
  const { bannerId, cardId, itemId } = req.params;
  const { img, title } = req.body;

  try {
    console.log("🟢 PUT update request received:", { bannerId, cardId, itemId, img: !!img, title: !!title });

    // Find banner by id (bannerId expected to be a valid _id for the document)
    const banner = await CategoryBanner.findById(bannerId);
    if (!banner) {
      console.warn("⚠️ Banner not found for id:", bannerId);
      return res.status(404).json({ message: "Banner not found" });
    }
    console.log("✅ Banner found:", { id: banner._id, category: banner.category });

    // Find card safely (convert both to string)
    const card = banner.cardsData.find((c) => String(c._id) === String(cardId));
    if (!card) {
      console.warn("⚠️ Card not found. Available card ids:", banner.cardsData.map(c => String(c._id)));
      return res.status(404).json({ message: "Card not found" });
    }
    console.log("✅ Card found:", { id: card._id, footer: card.footer });

    // Find item safely (convert both to string)
    const item = card.items.find((i) => String(i._id) === String(itemId));
    if (!item) {
      console.warn("⚠️ Item not found. Available item ids in this card:", card.items.map(i => String(i._id)));
      return res.status(404).json({ message: "Item not found" });
    }
    console.log("✅ Item found (before update):", { id: item._id, title: item.title, img: item.img });

    // Update
    if (img) item.img = img;
    if (title) item.title = title;

    await banner.save();
    console.log("✅ Item updated and banner saved");

    // Return updated banner
    const updatedBanner = await CategoryBanner.findById(bannerId);
    return res.status(200).json({ message: "Item updated successfully", banner: updatedBanner });
  } catch (err) {
    console.error("❌ updateProductInBanner error:", err);
    return res.status(500).json({ message: "Update failed", error: err.message });
  }
};

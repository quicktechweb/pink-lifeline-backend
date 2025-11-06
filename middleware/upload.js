const multer = require("multer");

// store in memory to send to ImgBB
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;

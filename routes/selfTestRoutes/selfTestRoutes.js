import express from "express";
import { isUserExist } from "../../middleware/isUserExist.js";
import { getVideoStream, addSelfTestStep, getAllSteps, updateSteps } from "../../controllers/SelfTest/selfTest.js";
import uploadVideo from "../../middleware/upload.js";

const router = express.Router();

router.get("/v1/video/:videoId", getVideoStream);

router.post("/v1/add-step", uploadVideo.single("video"), addSelfTestStep);

router.get("/v1/get-all-steps", getAllSteps);
router.put("/v1/update-step-by-id/:stepId", uploadVideo.single("video"), updateSteps);

// router.get("/v1/questions",getSelfTestQuestions)

export default router;

import express from "express";
import { isUserExist } from "../../middleware/isUserExist.js";
import { getVideoStream, addSelfTestStep, getAllSteps, updateSteps,deleteStep, getAllStepsQuestionsAnswers } from "../../controllers/SelfTest/selfTestSteps.js";
import uploadVideo from "../../middleware/upload.js";
import { addAnswer, deleteAnswer, getAnswersByQuestion, updateAnswer } from "../../controllers/SelfTest/selfTestAnswers.js";
import { addQuestion, deleteQuestion, getQuestionsByStep, updateQuestion } from "../../controllers/SelfTest/selfTestQuestions.js";

const router = express.Router();

router.get("/v1/video/:videoId", getVideoStream);

router.post("/v1/add-step", uploadVideo.single("video"), addSelfTestStep);

router.get("/v1/get-all-steps", getAllSteps);
router.put("/v1/update-step-by-id/:stepId", uploadVideo.single("video"), updateSteps);
router.delete("/v1/delete-step-by-id/:stepId",deleteStep)







router.post("/v1/add-question", addQuestion);

router.get("/v1/get-questions/:stepId", getQuestionsByStep);

router.put("/v1/update-question/:questionId", updateQuestion);

router.delete("/v1/delete-question/:questionId", deleteQuestion);


router.post("/v1/add-answer", addAnswer);

router.get("/v1/get-answers/:questionId", getAnswersByQuestion);

router.put("/v1/update-answer/:answerId", updateAnswer);

router.delete("/v1/delete-answer/:answerId", deleteAnswer);




router.get("/v1/get-all-question-by-steps",getAllStepsQuestionsAnswers)

// gg 

// router.get("/v1/questions",getSelfTestQuestions)

export default router;

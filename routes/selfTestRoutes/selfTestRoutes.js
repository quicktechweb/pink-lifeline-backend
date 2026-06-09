import express from "express";
import { getVideoStream, addSelfTestStep, getAllSteps, updateSteps, deleteStep, getAllStepsQuestionsAnswers, getAllTestSteps2, updateSteps2, addSelfTestStepV2, addUserSelfTest, deleteSelfTestId, updateSelfTestQuestion2, deleteSelfTestQuestionById2 } from "../../controllers/SelfTest/selfTestSteps.js";
import { addQuestion, deleteQuestion, getAllQuestions, getQuestionsByStep, updateQuestion } from "../../controllers/SelfTest/selfTestQuestions.js";
import { addAnswer, deleteAnswer, getAnswersByQuestion, updateAnswer, getAllAnswers } from "../../controllers/SelfTest/selfTestAnswers.js";

import { isUserExist } from "../../middleware/isUserExist.js";
import uploadVideo from "../../middleware/upload.js";
import { performSelfTest } from "../../controllers/SelfTest/performSelfTest.js";

const router = express.Router();

router.get("/v1/video/:videoId", getVideoStream);

router.post("/v1/add-step", uploadVideo.single("video"), addSelfTestStep);

router.get("/v1/get-all-steps", getAllSteps);
router.put("/v1/update-step-by-id/:stepId", uploadVideo.single("video"), updateSteps);
router.delete("/v1/delete-step-by-id/:stepId", deleteStep);

router.post("/v1/add-question", addQuestion);

router.get("/v1/get-questions/:stepNo", getQuestionsByStep);

router.get("/v1/get-all-questions", getAllQuestions);

router.put("/v1/update-question/:questionId", updateQuestion);

router.delete("/v1/delete-question/:questionId", deleteQuestion);

router.post("/v1/add-answer", addAnswer);

router.get("/v1/get-answers/:questionId", getAnswersByQuestion);

router.put("/v1/update-answer/:answerId", updateAnswer);

router.delete("/v1/delete-answer/:answerId", deleteAnswer);

router.get("/v1/get-all-answers", getAllAnswers);

router.get("/v1/get-all-question-by-steps", getAllStepsQuestionsAnswers);

router.post("/v1/perform-self-test/:userId", isUserExist, performSelfTest);








// v2

router.post("/v2/create-self-test-step", addSelfTestStepV2);

router.post("/v2/create-user-self-test", addUserSelfTest);

router.delete("/v2/delete-self-test/:stepId", deleteSelfTestId);

router.get("/v2/get-all-test-steps", getAllTestSteps2);

router.patch("/v2/update-self-test-step/:stepId", updateSteps2);



router.delete("/v2/delete-self-test-question/:stepId/:questionId", deleteSelfTestQuestionById2);


// updateSelfTestQuestion2

router.put("/v2/update-self-test-question/:stepId",updateSelfTestQuestion2)





// v3

router.post("/v3/create-steps/", getVideoStream);




export default router;

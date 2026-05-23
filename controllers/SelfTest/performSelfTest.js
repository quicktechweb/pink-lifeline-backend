import { SelfTestStep } from "../../models/SelfTest/selfTestModel.js";
import { UserSelfTest } from "../../models/SelfTest/selfTestUserMode.js";
import { badRequestResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";

export const performSelfTest = async (req, res) => {
  try {
    const { userId } = req.params;
    const { selfTest } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    const totalQuestions = await SelfTestStep.countDocuments();

    if (!Array.isArray(selfTest) || selfTest.length === 0) {
      return badRequestResponse(res, "Need to answer all the questions.", "selfTest must be a non-empty array");
    }

    /* =========================
   CHECK QUESTION COUNT MATCH
========================= */

    if (selfTest.length !== totalQuestions) {
      return badRequestResponse(res, "All questions must be answered.", `Expected ${totalQuestions} answers but got ${selfTest.length}`);
    }

    /* =========================
       FORMAT DATA
    ========================= */

    const formattedSelfTest = selfTest.map((item) => ({
      questionId: item.questionId,
      answerId: item.answerId,
      answerScore: item.answerScore ?? item.answerScore ?? 0,
    }));

    /* =========================
       SAVE IN DB
    ========================= */

    const saved = await UserSelfTest.create({
      userId,
      selfTest: formattedSelfTest,
    });

    return successResponse(res, saved, "Self test submitted successfully", "Self test submitted successfully");
  } catch (error) {
    console.error("performSelfTest error:", error);

    return somethingWentWrong(res, error.message, "Failed to perform self test", error.message);
  }
};

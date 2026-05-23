import { SelfTestStep } from "../../models/SelfTest/selfTestModel.js";
import { UserSelfTest } from "../../models/SelfTest/selfTestUserMode.js";
import { badRequestResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";







export const performSelfTest = async (req, res) => {

  try {

        const { userId } = req.params;

    const { currentDate, selfTest } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (!userId) {
      return badRequestResponse(
        res,
        "User not found",
        "User not found"
      );
    }

    if (!Array.isArray(selfTest) || selfTest.length === 0) {
      return badRequestResponse(
        res,
        "Self test data is required",
        "Self test data is required"
      );
    }

    /* =========================
       FORMAT SELF TEST
    ========================= */

    const formattedSelfTest = selfTest.map((item) => ({
      questionId: item.questionId,
      answerId: item.answerId,
      answerScore: item.answerScore || 0,
    }));

    /* =========================
       CREATE
    ========================= */

    const userSelfTest = await UserSelfTest.create({
      userId,
      currentDate: currentDate || new Date(),
      selfTest: formattedSelfTest,
    });

    return successResponse(
      res,
      userSelfTest,
      "User self test added successfully",
      "User self test added successfully"
    );
  } catch (error) {
    console.error("addUserSelfTest error:", error);

    return somethingWentWrong(
      res,
      error.message,
      "Failed to add user self test",
      error.message
    );
  }
};
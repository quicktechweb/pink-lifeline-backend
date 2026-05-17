import { SelfTestQuestion } from "../../models/SelfTest/selfTestQuestionModel.js";
import { SelfTestStep } from "../../models/SelfTest/selfTestStepsModel.js";
import { badRequestResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";

export const addQuestion = async (req, res) => {
  try {
    let { questionId, title, stepId, serial } = req.body;

    const step = await SelfTestStep.findById(stepId);

    if (!step) {
      return badRequestResponse(res, "Step not found", "Step not found");
    }

    const question = await SelfTestQuestion.create({
      questionId,
      title,
      stepId,
      serial,
    });

    return successResponse(
      res,
      question,
      "Question created successfully",
      "Question created successfully"
    );
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to create question", error.message);
  }
};




export const getQuestionsByStep = async (req, res) => {
  try {
    const { stepId } = req.params;

    const questions = await SelfTestQuestion.find({ stepId }).sort({
      serial: 1,
    });

    return successResponse(
      res,
      questions,
      "Questions fetched successfully",
      "Questions fetched successfully"
    );
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to fetch questions", error.message);
  }
};



export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { title, serial } = req.body;

    const question = await SelfTestQuestion.findById(questionId);

    if (!question) {
      return badRequestResponse(res, "Question not found", "Question not found");
    }

    if (title) question.title = title;
    if (serial) question.serial = serial;

    await question.save();

    return successResponse(
      res,
      question,
      "Question updated successfully",
      "Question updated successfully"
    );
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to update question", error.message);
  }
};



export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await SelfTestQuestion.findById(questionId);

    if (!question) {
      return badRequestResponse(res, "Question not found", "Question not found");
    }

    // delete all answers under question
    await SelfTestAnswer.deleteMany({
      questionId: question._id,
    });

    await SelfTestQuestion.findByIdAndDelete(questionId);

    return successResponse(
      res,
      null,
      "Question deleted successfully",
      "Question deleted successfully"
    );
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to delete question", error.message);
  }
};




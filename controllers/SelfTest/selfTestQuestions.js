import { SelfTestAnswer } from "../../models/SelfTest/selfTestAnswerModel.js";
import { SelfTestQuestion } from "../../models/SelfTest/selfTestQuestionModel.js";
import { SelfTestStep } from "../../models/SelfTest/selfTestStepsModel.js";
import { badRequestResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";
import { ObjectId } from 'mongodb';



export const addQuestion = async (req, res) => {
  try {
    let {  title,  stepNo } = req.body;

    const isSerialExist = await SelfTestStep.findOne({stepNo})
    
    if (isSerialExist) {
      const question = await SelfTestQuestion.create({
        title,
        stepNo,
        stepId:isSerialExist._id.toString()
      });

      

      if (question) {
           return successResponse(
              res,
              question,
              "Question created successfully.",
              "Question created successfully."
            );
      }
    } else {
      return somethingWentWrong(res,undefined,"Step No not found.","Step No not found.")
    }


 
  } catch (error) {
    return somethingWentWrong(res, error.message, "Failed to create question", error.message);
  }
};








export const getQuestionsByStep = async (req, res) => {
  try {
    const { stepNo } = req.params;

    const questions = await SelfTestQuestion.find({ stepNo }).sort({
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








export const getAllQuestions = async (req, res) => {
  try {

    const questions = await SelfTestQuestion.find()
      // .populate("stepId")
      .sort({ createdAt: -1 });

    if (!questions || questions.length === 0) {
      return somethingWentWrong(
        res,
        undefined,
        "No questions found.",
        "No questions found."
      );
    }

    return successResponse(
      res,
      questions,
      "Questions fetched successfully.",
      "Questions fetched successfully."
    );

  } catch (error) {

    console.log("🚀 ~ getAllQuestions ~ error:", error);

    return somethingWentWrong(
      res,
      error.message,
      "Failed to fetch questions.",
      error.message
    );
  }
};


export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { title, stepNo } = req.body;

    const question = await SelfTestQuestion.findById( { _id: new ObjectId(questionId) });
   

    if (!question) {
      return badRequestResponse(res, "Question not found", "Question not found");
    }

    if (title) question.title = title;
    if (stepNo) question.stepNo = stepNo;

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

    const question = await SelfTestQuestion.findById({ _id: questionId});
    console.log("🚀 ~ selfTestQuestions.js:147 ~ deleteQuestion ~ question:", question)








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




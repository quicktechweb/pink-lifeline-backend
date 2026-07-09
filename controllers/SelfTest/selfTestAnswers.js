import { SelfTestAnswer } from '../../models/SelfTest/selfTestAnswerModel.js';
import { SelfTestQuestion } from '../../models/SelfTest/selfTestQuestionModel.js';
import {
  badRequestResponse,
  somethingWentWrong,
  successResponse,
} from '../../utils/utils.js';

export const addAnswer = async (req, res) => {
  try {
    let { title, questionId, score } = req.body;

    const question = await SelfTestQuestion.findById({ _id: questionId });

    if (!question) {
      return badRequestResponse(
        res,
        'Question not found',
        'Question not found'
      );
    }

    const answer = await SelfTestAnswer.create({
      title,
      questionId,
      score,
    });

    return successResponse(
      res,
      answer,
      'Answer created successfully',
      'Answer created successfully'
    );
  } catch (error) {
    return somethingWentWrong(
      res,
      error.message,
      'Failed to create answer',
      error.message
    );
  }
};

export const getAnswersByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const answers = await SelfTestAnswer.find({ questionId });

    return successResponse(
      res,
      answers,
      'Answers fetched successfully',
      'Answers fetched successfully'
    );
  } catch (error) {
    return somethingWentWrong(
      res,
      error.message,
      'Failed to fetch answers',
      error.message
    );
  }
};

export const updateAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { title, score } = req.body;

    const answer = await SelfTestAnswer.findById(answerId);

    if (!answer) {
      return badRequestResponse(res, 'Answer not found', 'Answer not found');
    }

    if (title) answer.title = title;
    if (score !== undefined) answer.score = score;

    await answer.save();

    return successResponse(
      res,
      answer,
      'Answer updated successfully',
      'Answer updated successfully'
    );
  } catch (error) {
    return somethingWentWrong(
      res,
      error.message,
      'Failed to update answer',
      error.message
    );
  }
};

export const deleteAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;

    const answer = await SelfTestAnswer.findById(answerId);

    if (!answer) {
      return badRequestResponse(res, 'Answer not found', 'Answer not found');
    }

    await SelfTestAnswer.findByIdAndDelete(answerId);

    return successResponse(
      res,
      null,
      'Answer deleted successfully',
      'Answer deleted successfully'
    );
  } catch (error) {
    return somethingWentWrong(
      res,
      error.message,
      'Failed to delete answer',
      error.message
    );
  }
};

export const getAllAnswers = async (req, res) => {
  try {
    const answers = await SelfTestAnswer.find()
      // .populate({
      //   path: "questionId",
      //   populate: {
      //     path: "stepId",
      //     model: "SelfTestStep",
      //   },
      // })
      .sort({ createdAt: -1 });

    if (!answers || answers.length === 0) {
      return badRequestResponse(res, 'No answers found.', 'No answers found.');
    }

    return successResponse(
      res,
      answers,
      'Answers fetched successfully.',
      'Answers fetched successfully.'
    );
  } catch (error) {
    console.error('🚀 ~ getAllAnswers ~ error:', error);

    return somethingWentWrong(
      res,
      error.message,
      'Failed to fetch answers.',
      error.message
    );
  }
};

import fs from "fs";
import path from "path";
import { badRequestResponse, notFoundResponse, somethingWentWrong, successResponse } from "../../utils/utils.js";
// import { SelfTestStep } from "../../models/SelfTest/selfTestStepsModel.js";
import { SelfTestStep } from "../../models/SelfTest/selfTestModel.js";
import { SelfTestQuestion } from "../../models/SelfTest/selfTestQuestionModel.js";
import { SelfTestAnswer } from "../../models/SelfTest/selfTestAnswerModel.js";

export const getVideoStream = async (req, res) => {
  try {
    const videoName = req.params.videoId;

    const videoPath = path.join(process.cwd(), "uploads", videoName);

    // 🔹 Check file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // 🔹 Get video size FIRST
    const videoSize = fs.statSync(videoPath).size;

    // 🔹 Get range
    const range = req.headers.range;

    // 🔹 Normal request (without range)
    if (!range) {
      const headers = {
        "Content-Length": videoSize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(200, headers);

      fs.createReadStream(videoPath).pipe(res);

      return;
    }

    // 🔹 Streaming request
    const chunkSize = 10 ** 6;

    const start = Number(range.replace(/bytes=/, "").split("-")[0]);

    const end = Math.min(start + chunkSize - 1, videoSize - 1);

    const contentLength = end - start + 1;

    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, headers);

    const stream = fs.createReadStream(videoPath, {
      start,
      end,
    });

    stream.pipe(res);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllSteps = async (req, res) => {
  try {
    const getAllSteps = await SelfTestStep.find().sort({ stepNo: 1 });
    successResponse(res, getAllSteps, "All is fetched.", "All steps is fetched successfully.");
  } catch (error) {
    console.error(error);
    somethingWentWrong(res, undefined, "Unable to get all steps.", "Unable to get all the steps.");
  }
};

export const updateSteps = async (req, res) => {
  try {
    const stepId = req.params.stepId;

    let { stepNo, title } = req.body;

    if (stepNo) {
      stepNo = Number(stepNo);
    }

    // =========================
    // Find Existing Step
    // =========================

    const existingStep = await SelfTestStep.findById(stepId);

    if (!existingStep) {
      return badRequestResponse(res, "Step not found.", "Step not found.");
    }

    // =========================
    // Shift Serial Logic
    // =========================

    if (stepNo && stepNo !== existingStep.stepNo) {
      // TEMPORARY VALUE
      existingStep.stepNo = -9999;
      await existingStep.save();

      // -------------------------
      // Moving Down
      // Example: 2 -> 5
      // -------------------------

      if (stepNo > existingStep.stepNo) {
        const steps = await SelfTestStep.find({
          stepNo: {
            $gt: existingStep.stepNo,
            $lte: stepNo,
          },
        }).sort({ stepNo: 1 });

        for (const step of steps) {
          step.stepNo = step.stepNo - 1;
          await step.save();
        }
      }

      // -------------------------
      // Moving Up
      // Example: 5 -> 2
      // -------------------------
      else {
        const steps = await SelfTestStep.find({
          stepNo: {
            $gte: stepNo,
            $lt: existingStep.stepNo,
          },
        }).sort({ stepNo: -1 });

        for (const step of steps) {
          step.stepNo = step.stepNo + 1;
          await step.save();
        }
      }

      existingStep.stepNo = stepNo;
    }

    // =========================
    // Update Title
    // =========================

    if (title) {
      existingStep.title = title;
    }

    // =========================
    // Update Video
    // =========================

    if (req.file?.path) {
      // Delete old cloudinary video

      console.log("🚀 ~ selfTest.js:184 ~ updateSteps ~ existingStep.videoURL:", existingStep.videoURL);
      if (existingStep.videoURL) {
        try {
          const parts = existingStep.videoURL.split("/");

          const file = parts[parts.length - 1];
          console.log("🚀 ~ selfTest.js:190 ~ updateSteps ~ file:", file);

          const publicId = "self-test-videos/" + file.split(".")[0];
          console.log("🚀 ~ selfTest.js:192 ~ updateSteps ~ publicId:", publicId);

          await cloudinary.uploader.destroy(publicId, {
            resource_type: "video",
          });
        } catch (err) {
          console.log("Cloudinary delete failed", err.message);
        }
      }

      existingStep.videoURL = req.file.path;
    }

    // =========================
    // Final Save
    // =========================

    await existingStep.save();

    return successResponse(res, existingStep, "Step updated successfully.", "Step updated successfully.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error.message, "Step update failed.", error.message);
  }
};

export const addSelfTestStep = async (req, res) => {
  const payload = req.body;

  const { stepNo, title } = payload;

  try {
    // =========================
    // Get Uploaded Video URL
    // =========================

    const videoURL = req.file?.path;

    // =========================
    // Validation
    // =========================

    if (!stepNo) {
      return badRequestResponse(res, "Step No. not found.", "Step no is not found.");
    }

    if (!title) {
      return badRequestResponse(res, "Title not found.", "Title is not found.");
    }

    if (!videoURL) {
      return badRequestResponse(res, "Video not uploaded.", "Video not uploaded.");
    }

    // =========================
    // Shift Existing Steps
    // =========================

    const isStepExist = await SelfTestStep.findOne({
      stepNo: stepNo,
    });

    let responseMessage = "Self test step created successfully.";

    if (isStepExist) {
      const existingSteps = await SelfTestStep.find({
        stepNo: { $gte: stepNo },
      }).sort({ stepNo: -1 });

      for (const step of existingSteps) {
        step.stepNo = step.stepNo + 1;
        await step.save();
      }
    }

    // =========================
    // Create Step
    // =========================

    const newStep = await SelfTestStep.create({
      stepNo,
      title,
      videoURL,
    });

    return successResponse(res, newStep, responseMessage, responseMessage);
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error, "Unable to save step.", error.message);
  }
};

export const deleteStep = async (req, res) => {
  try {
    const { stepId } = req.params;

    // =========================
    // Find Step
    // =========================

    const step = await SelfTestStep.findById(stepId);

    if (!step) {
      return badRequestResponse(res, "Step not found.", "Step not found.");
    }

    const deletedStepNo = step.stepNo;

    // =========================
    // Delete Cloudinary Video
    // =========================

    if (step.videoURL) {
      try {
        const parts = step.videoURL.split("/");
        const file = parts[parts.length - 1];
        const publicId = "self-test-videos/" + file.split(".")[0];

        await cloudinary.uploader.destroy(publicId, {
          resource_type: "video",
        });
      } catch (err) {
        console.log("Cloudinary delete failed:", err.message);
      }
    }

    // =========================
    // Delete Step
    // =========================

    await SelfTestStep.findByIdAndDelete(stepId);

    // =========================
    // Reorder Remaining Steps
    // (shift all greater steps -1)
    // =========================

    await SelfTestStep.updateMany(
      {
        stepNo: { $gt: deletedStepNo },
      },
      {
        $inc: { stepNo: -1 },
      },
    );

    // =========================
    // Response
    // =========================

    return successResponse(res, null, "Step deleted successfully.", "Step deleted successfully.");
  } catch (error) {
    console.error(error);

    return somethingWentWrong(res, error.message, "Step deletion failed.", error.message);
  }
};

export const getAllStepsQuestionsAnswers = async (req, res) => {
  try {
    // =========================
    // 1. Get all steps
    // =========================

    const steps = await SelfTestStep.find().sort({
      stepNo: 1,
    });

    // =========================
    // 2. Get all questions
    // =========================

    const questions = await SelfTestQuestion.find();

    // =========================
    // 3. Get all answers
    // =========================

    const answers = await SelfTestAnswer.find();

    // =========================
    // 4. Build map for answers
    // =========================

    const answerMap = {};

    for (const ans of answers) {
      const qId = ans.questionId.toString();

      if (!answerMap[qId]) {
        answerMap[qId] = [];
      }

      answerMap[qId].push(ans);
    }

    // =========================
    // 5. Build map for questions
    // =========================

    const questionMap = {};

    for (const q of questions) {
      const sId = q.stepId.toString();

      if (!questionMap[sId]) {
        questionMap[sId] = [];
      }

      questionMap[sId].push({
        ...q.toObject(),
        answers: answerMap[q._id.toString()] || [],
      });
    }

    // =========================
    // 6. Merge into steps
    // =========================

    const result = steps.map((step) => {
      return {
        ...step.toObject(),
        questions: questionMap[step._id.toString()] || [],
      };
    });

    // =========================
    // 7. Response
    // =========================

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: error.message,
    });
  }
};


export const getAllTestSteps2 = async (req, res) => {
  try {
    const steps = await SelfTestStep.find().sort({ stepNo: 1 });
    if (!steps || steps == null || steps == undefined) {
      return badRequestResponse(res, "No steps found.", "No steps found.");
    }

    return successResponse(res, steps, "All test steps fetched successfully.", "All test steps fetched successfully.");
  } catch (error) {
    console.error(error);
    return badRequestResponse(res, "Unable to fetch all steps.", "Unable to fetch all the steps.");
  }
};

export const updateSteps2 = async (req, res) => {
  const stepId = req.params.stepId;
  if (!stepId) {
    return badRequestResponse(res, "Bad Request.", "stepId not found.");
  }
};







































export const addSelfTestStepV2 = async (req, res) => {
  try {
    const payload = req.body;
    console.log("🚀 ~ selfTestSteps.js:490 ~ addSelfTestStepV2 ~ payload:", payload)

    let { stepNo, title, questions, videoURL } = payload;

    /* =========================
       VALIDATION
    ========================= */

    if (!stepNo) {
      return badRequestResponse(res, "Step No. not found.", "Step no is not found.");
    }

    if (!title) {
      return badRequestResponse(res, "Title not found.", "Title is not found.");
    }

    if (!videoURL || typeof videoURL !== "string") {
      return badRequestResponse(
        res,
        "Video URL is required.",
        "Video URL must be a valid string."
      );
    }

    /* =========================
       OPTIONAL: YOUTUBE VALIDATION
    ========================= */

    const isValidYouTube =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(videoURL);

    if (!isValidYouTube) {
      return badRequestResponse(
        res,
        "Invalid YouTube URL.",
        "Only YouTube links are allowed."
      );
    }

    /* =========================
       SHIFT EXISTING STEPS
    ========================= */

    const isStepExist = await SelfTestStep.findOne({ stepNo });

    let responseMessage = "Self test step created successfully.";

    if (isStepExist) {
      const existingSteps = await SelfTestStep.find({
        stepNo: { $gte: stepNo },
      }).sort({ stepNo: -1 });

      for (const step of existingSteps) {
        step.stepNo = step.stepNo + 1;
        await step.save();
      }
    }

    /* =========================
       PARSE QUESTIONS
    ========================= */

    if (typeof questions === "string") {
      questions = JSON.parse(questions);
    }

    const formattedQuestions =
      questions?.map((question) => ({
        title: question.title,
        answers:
          question.answers?.map((answer) => ({
            title: answer.title,
            score: answer.score || 0,
          })) || [],
      })) || [];

    /* =========================
       CREATE STEP
    ========================= */

    const newStep = await SelfTestStep.create({
      stepNo,
      title,
      videoURL, // now always YouTube link string
      questions: formattedQuestions,
    });

    return successResponse(res, newStep, responseMessage, responseMessage);
  } catch (error) {
    console.error(error);
    return somethingWentWrong(res, error, "Unable to save step.", error.message);
  }
};







export const deleteSelfTestId = async (req,res) => {
  const { stepId } = req.params
  try {
    const deletedStep = await SelfTestStep.findById({_id:stepId});
    if (deleteStep == null ) {
      notFoundResponse( res,"Data not found",`Delete happens successfully Id: ${stepId}`)
    }else{
      const deleteStep = await SelfTestStep.findByIdAndDelete({_id:stepId})
      deleteStep && successResponse(res,deleteStep,"Data deleted successfully.",`Deleted data is id:${stepId}`)
      notFoundResponse( res,"Data not found",`Delete happens successfully Id: ${stepId}`)
    }
  } catch (error) {
    console.error(error)
    badRequestResponse(res,"Unable to delete this step.",`Unable to delete this step id:${stepId}`)
  }
}





export const updateSelfTestQuestion2 = async (req, res) => {
  const { stepId } = req.params;
  const { questionId, title } = req.body;

  try {
    const step = await SelfTestStep.findById(stepId);

    if (!step) {
      return notFoundResponse(
        res,
        "Step not found.",
        `Step not found. Id: ${stepId}`
      );
    }

    // Edit existing question
    if (questionId) {
      const question = step.questions.id(questionId);

      if (!question) {
        return notFoundResponse(
          res,
          "Question not found.",
          `Question not found. Id: ${questionId}`
        );
      }

      question.title = title;

      await step.save();

      return successResponse(
        res,
        question,
        "Question updated successfully.",
        `Updated question id: ${questionId}`
      );
    }

    // Add new question
    step.questions.push({
      title,
      answers: [],
    });

    await step.save();

    return successResponse(
      res,
      step.questions[step.questions.length - 1],
      "Question added successfully.",
      `Question added to step id: ${stepId}`
    );
  } catch (error) {
    console.error(error);

    return badRequestResponse(
      res,
      "Unable to update question.",
      error.message
    );
  }
};










export const addUserSelfTest = async (req,res) => {
  
}
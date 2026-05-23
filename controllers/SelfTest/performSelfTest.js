import { successResponse } from "../../utils/utils.js";

export const performSelfTest = async (req, res) => {
    const { userId } = req.params
    // const 


    return successResponse(res,userId)
};

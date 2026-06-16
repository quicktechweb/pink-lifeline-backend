import express from "express";
import { addBleeding, addSpotting, addSymptom, deleteBleeding, deleteSpotting, deleteSymptom, getAllBleeding, getAllSpotting, getAllSymptoms, updateBleeding, updateSpotting, updateSymptom } from "../../controllers/dropdowns/dropdowns.js";

const router = express.Router();

router.post("/v1/add-spotting", addSpotting);

router.get("/v1/get-all-spotting", getAllSpotting);

router.put("/v1/update-spotting/:spottingId", updateSpotting);

router.delete("/v1/delete-spotting/:spottingId", deleteSpotting);













router.post("/v1/add-bleeding", addBleeding);

router.get("/v1/get-all-bleeding", getAllBleeding);

router.put("/v1/update-bleeding/:bleedingId", updateBleeding);

router.delete("/v1/delete-bleeding/:bleedingId", deleteBleeding);









router.post("/v1/add-symptom", addSymptom);

router.get("/v1/get-all-symptoms", getAllSymptoms);

router.put("/v1/update-symptom/:symptomId", updateSymptom);

router.delete("/v1/delete-symptom/:symptomId", deleteSymptom);


export default router;

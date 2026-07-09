// routes/Degree/degreeRoutes.js

import express from 'express';
import {
  addDegree,
  deleteDegree,
  getAllDegrees,
  updateDegree,
} from '../../controllers/degrees/degree.js';

const router = express.Router();

/* =========================
   DEGREE ROUTES
========================= */

router.post('/v1/add-degree', addDegree);

router.get('/v1/get-all-degrees', getAllDegrees);

router.post('/v1/update-degree/:degreeId', updateDegree);

router.delete('/v1/delete-degree/:degreeId', deleteDegree);

export default router;

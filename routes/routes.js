import { Router } from "express";
import doctorRoutes from "./../routes/doctorRoutes/doctorRoutes.js"

const routes = Router()


routes.use("/v1/doctor/registration",doctorRoutes)
















export default routes
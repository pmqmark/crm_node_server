import { Router } from "express";
import { roleGuard } from '../middleware/roleguard';
import {  authMiddleware } from '../middleware/verifyToken';
import {AdminController} from "../controllers/adminController"
import {DepartmentController} from "../controllers/departmentcontroller"
import { EmployeeController } from "../controllers/employeecontroller";
const employeeController = new EmployeeController()

const router =Router();
router.use(authMiddleware)
router.use(roleGuard(["Employee"]))

router.get("/",(req,res,next)=>{
    employeeController.findEmployee(req,res)
})




export default router;

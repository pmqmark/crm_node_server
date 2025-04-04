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


router.get("/check-in",(req,res)=>{
    employeeController.checkIn(req,res)
})


router.get("/check-out",(req,res)=>{
    employeeController.checkOut(req,res)
})


router.post("/appy-leave",(req,res)=>{
    employeeController.applyLeave(req,res);
})

router.get("/my-projects",(req,res)=>{
    employeeController.getAssignedProjects(req,res);
})

router.post("/assign-task",(req,res)=>{
    employeeController.assignTask(req,res);
})

router.get("/my-tasks",(req,res)=>{
    employeeController.getMyTasks(req,res);
})





router.get("/punch-status", (req,res)=>{
    employeeController.checkPunchStatus(req,res)
});



export default router;

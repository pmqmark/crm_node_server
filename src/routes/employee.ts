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


router.get("/findallemployee",(req,res,next)=>{
    employeeController.listEmployees(req,res)
})


router.get("/punch-status", (req,res)=>{
    employeeController.checkPunchStatus(req,res)
});

router.post('/update-task',(req,res)=>{
    employeeController.updateTask(req,res);
})


router.get('/list-project',(req,res)=>{
    console.log("list project")
    employeeController.listProjects(req,res)

})

router.get("/leave-history", (req, res) => {
    employeeController.getMyLeaveHistory(req, res);
  });

router.get("/my-profile", (req, res) => {
    employeeController.getMyProfile(req, res);
});

router.get("/department-colleagues", authMiddleware, (req, res) => {
    employeeController.getDepartmentColleagues(req, res);
});

router.get("/my-skills", authMiddleware, (req, res) => {
    employeeController.getMySkills(req, res);
});

router.post("/add-skill", authMiddleware, (req, res) => {
    employeeController.addSkill(req, res);
});

router.put("/update-skill", authMiddleware, (req, res) => {
    employeeController.updateSkill(req, res);
});

router.delete("/delete-skill", authMiddleware, (req, res) => {
    employeeController.deleteSkill(req, res);
});

export default router;

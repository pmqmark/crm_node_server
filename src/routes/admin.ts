import { Router } from "express";
import { roleGuard } from '../middleware/roleguard';
import {  authMiddleware } from '../middleware/verifyToken';
import {AdminController} from "../controllers/adminController"
import {DepartmentController} from "../controllers/departmentcontroller"
const router =Router();
const adminController = new AdminController();
const departmentcontroller = new DepartmentController(); 
router.use(authMiddleware)
router.use(roleGuard(["Admin"]))
router.post('/createadmin',(req,res,next)=>{
    adminController.createAdmin(req,res)
});

router.post('/createemployee',(req,res,next)=>{
    adminController.createEmployee(req,res)
});

router.post('/createdepartment',(req,res,next)=>{
    adminController.createDepartment(req,res)
});

router.post('/updatedepartment',(req,res,next)=>{
    departmentcontroller.updateDepartment(req,res)
});



export default router;



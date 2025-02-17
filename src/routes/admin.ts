import { Router } from "express";
import { roleGuard } from '../middleware/roleguard';
import {  authMiddleware } from '../middleware/verifyToken';
import {AdminController} from "../controllers/adminController"
import {DepartmentController} from "../controllers/departmentcontroller"
import { EmployeeController } from "../controllers/employeecontroller";
const router =Router();
const adminController = new AdminController();
const departmentcontroller = new DepartmentController(); 
const employeeController = new EmployeeController()
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

router.put('/updatedepartment',(req,res,next)=>{
    departmentcontroller.updateDepartment(req,res)
});

router.get('/getdepartments',(req,res,next)=>{
    departmentcontroller.listDepartments(req,res)
});
router.get("/findallemployee",(req,res,next)=>{
    employeeController.listEmployees(req,res)
})

router.put('/updateemp',(req,res)=>{
    employeeController.updateEmployee(req,res)
})

router.get('/search',(req,res,next)=>{
   
    employeeController.searchEmployee(req,res)
})

router.delete('/deleteemployee',(req,res,next)=>{
    employeeController.deleteEmployee(req,res)
})

export default router;



import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { CreateAdminDto } from "../dtos/admindto";
import { CreateEmployeeDto } from "../dtos/employeedto";
import { IDepartment } from "../dtos/departmentdto";
import Admin from '../models/admin'
import Employee from "../models/employee";
import Department from "../models/department";


export class AdminController{
    async createAdmin (req: Request, res: Response): Promise<Response>{
        try {
          const adminData: CreateAdminDto = req.body;
          
         
          const hashedPassword = await bcrypt.hash(adminData.password, 10);
          
          
          const admin = new Admin({
            email: adminData.email,
            password: hashedPassword,
            username: adminData.username,
            admin_id: adminData.admin_id,
            createdAt: new Date(),
            lastLogin: null,
          });
      
          const savedAdmin = await admin.save();
      
          return res.status(201).json({
            message: "Admin created successfully",
            admin: savedAdmin,
          });
      
        } catch (error: unknown) {
          if (error instanceof Error) {
            return res.status(500).json({ 
              message: `Error creating admin: ${error.message}` 
            });
          }
          return res.status(500).json({ 
            message: "An unknown error occurred while creating admin" 
          });
        }
    };


    async createEmployee (req: Request, res: Response): Promise<Response>{
      try {
        const employeeData: CreateEmployeeDto = req.body;
        
        
        const hashedPassword = await bcrypt.hash(employeeData.password, 10);
        
        const employee = new Employee({
          employee_id: employeeData.employee_id,
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          email: employeeData.email,
          password: hashedPassword,
          phone: employeeData.phone,
          hireDate: new Date(),
          createdAt: new Date(),
          lastLogin: null,
          ...(employeeData.department_id && { department_id: employeeData.department_id }),
          ...(employeeData.role_id && { role_id: employeeData.role_id }),
        });
    
        const savedEmployee = await employee.save();
    
        return res.status(201).json({
          message: "Employee created successfully",
          admin: savedEmployee,
        });
    
      } catch (error: unknown) {
        if (error instanceof Error) {
          return res.status(500).json({ 
            message: `Error creating Employee: ${error.message}` 
          });
        }
        return res.status(500).json({ 
          message: "An unknown error occurred while creating Employee" 
        });
      }
  };

  async createDepartment (req: Request, res: Response) {
    try {
      const departmentData: IDepartment = req.body;
  
     
      if (departmentData.manager_id) {
        const managerExists = await Employee.findById(departmentData.manager_id);
        if (!managerExists) {
          throw new Error("Invalid manager_id. Employee does not exist.");
        }
      }
  
      
      const department = new Department({
        name: departmentData.name,
        description: departmentData.description,
        created_at: new Date(),
        ...(departmentData.manager_id && { manager_id: departmentData.manager_id }),
      });
  
      const savedDepartment = await department.save();
  
      return res.status(201).json({
        message: "Department created successfully",
        department: savedDepartment,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error creating department",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

}




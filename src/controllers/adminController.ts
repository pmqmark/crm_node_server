import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { CreateAdminDto } from "../dtos/admindto";
import { CreateEmployeeDto } from "../dtos/employeedto";
import { IDepartment } from "../dtos/departmentdto";
import Admin from '../models/admin'
import Employee from "../models/employee";
import Department from "../models/department";
import Permission from "../models/permission";
import { Types } from 'mongoose';


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


    async createEmployee(req: Request, res: Response): Promise<Response> {
      try {
        const employeeData: CreateEmployeeDto = req.body;
        
        const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    
        let assignedPermissions: Types.ObjectId[] = [];
    
        // Convert permissions to ObjectIds if provided
        if (employeeData.permissions && Array.isArray(employeeData.permissions)) {
          assignedPermissions = employeeData.permissions.map(
            (permId) => new Types.ObjectId(permId.toString())
          );
        }
    
        // Create the employee without any manager-specific logic
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
          permissions: assignedPermissions,
          ...(employeeData.department_id && { department_id: employeeData.department_id }),
          ...(employeeData.role_id && { role_id: employeeData.role_id }),
        });
    
        const savedEmployee = await employee.save();
    
        // If this employee is already set as a manager for any department,
        // we need to assign department permissions to them
        if (savedEmployee._id) {
          const departmentWithThisManager = await Department.findOne({ 
            manager_id: savedEmployee._id 
          });
          
          // Fix: Check if permissions exist and have length
          if (departmentWithThisManager && departmentWithThisManager.permissions && 
              departmentWithThisManager.permissions.length > 0) {
            
            // Convert permissions to ObjectIds before assigning
            const permissionObjectIds = departmentWithThisManager.permissions.map(
              permId => typeof permId === 'string' ? new Types.ObjectId(permId) : permId
            );
            
            // This employee is already a manager, assign department permissions
            await Employee.findByIdAndUpdate(
              savedEmployee._id,
              { permissions: permissionObjectIds }
            );
            
            // Update the returned object to include updated permissions
            savedEmployee.permissions = permissionObjectIds;
          }
        }
    
        return res.status(201).json({
          message: "Employee created successfully",
          employee: savedEmployee,
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

  async createDepartment(req: Request, res: Response) {
    try {
      const departmentData: IDepartment = req.body;
  
      if (departmentData.manager_id) {
        const managerExists = await Employee.findById(departmentData.manager_id);
        if (!managerExists) {
          throw new Error("Invalid manager_id. Employee does not exist.");
        }
      }
  
      // Convert permissions to ObjectIds if provided
      let permissionIds: Types.ObjectId[] = [];
      if (departmentData.permissions && Array.isArray(departmentData.permissions)) {
        permissionIds = departmentData.permissions.map(
          (permId) => new Types.ObjectId(permId.toString())
        );
      }
  
      const department = new Department({
        name: departmentData.name,
        description: departmentData.description,
        created_at: new Date(),
        permissions: permissionIds, // Use converted permissions
        ...(departmentData.manager_id && { manager_id: departmentData.manager_id }),
      });
  
      const savedDepartment = await department.save();
  
      // If manager exists, update the manager with converted permission IDs
      if (departmentData.manager_id && permissionIds.length > 0) {
        await Employee.findByIdAndUpdate(
          departmentData.manager_id,
          { $set: { permissions: permissionIds } }
        );
      }
      
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

  async createPermission(req: Request, res: Response): Promise<Response> {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          message: "Permission name is required"
        });
      }
      
      const permission = new Permission({
        name: name.trim()
      });
      
      const savedPermission = await permission.save();
      
      return res.status(201).json({
        message: "Permission created successfully",
        permission: savedPermission
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error creating permission",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async listPermissions(req: Request, res: Response): Promise<Response> {
    try {
      const permissions = await Permission.find();
      
      return res.status(200).json({
        message: "Permissions retrieved successfully",
        data: permissions
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving permissions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}




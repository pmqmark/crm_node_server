import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { CreateAdminDto } from "../dtos/admindto";
import { CreateEmployeeDto } from "../dtos/employeedto";
import { IDepartment } from "../dtos/departmentdto";
import Admin from '../models/admin'
import Employee from "../models/employee";
import Department from "../models/department";
import { Client, IClient } from "../models/client";
import Role from "../models/role";
import { IRole } from "../dtos/roledto";
import { Project } from "../models/projects";
import mongoose, { Types } from "mongoose";


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

    async  createClient(req: Request, res: Response): Promise<Response> {
      try {
        const clientData: IClient = req.body;
    
        const hashedPassword = await bcrypt.hash(clientData.password, 10);
    
        const client = new Client({
          email: clientData.email,
          password: hashedPassword,
          companyName: clientData.companyName,
          contactPerson: clientData.contactPerson,
          phone: clientData.phone,
          address: clientData.address,
          description:clientData.description,
          createdAt: new Date(),
          lastLogin: null,
        });
    
        const savedClient = await client.save();
    
        return res.status(201).json({
          message: 'Client created successfully',
          client: savedClient,
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          return res.status(500).json({
            message: `Error creating client: ${error.message}`,
          });
        }
        return res.status(500).json({
          message: 'An unknown error occurred while creating client',
        });
      }
    }


    async  createRoles(req: Request, res: Response): Promise<Response>{
      try {
        const { name, description } = req.body;
    
        // Create a new role with an empty permissions array
        const role = new Role({
          name,
          description,
          permissions: [], // Empty array for now
        });
    
        const savedRole = await role.save();
    
        return res.status(201).json({
          message: 'Role created successfully',
          role: savedRole,
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          return res.status(500).json({
            message: `Error creating role: ${error.message}`,
          });
        }
        return res.status(500).json({
          message: 'An unknown error occurred while creating the role',
        });
      }
    }


   async createEmployee(req: Request, res: Response): Promise<Response> {
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
      hireDate: employeeData.hireDate,
      dob: employeeData.dob,
      addressline1: employeeData.addressline1,
      addressline2: employeeData.addressline2,
      city: employeeData.city,
      state: employeeData.state,
      country: employeeData.country,
      postalcode: employeeData.postalcode,
      employeebio: employeeData.employeebio,
      createdAt: new Date(),
      lastLogin: null,
      ...(employeeData.department_id && { department_id: employeeData.department_id }),
      ...(employeeData.role_id && { role_id: employeeData.role_id }),
    });

    const savedEmployee = await employee.save();

    return res.status(201).json({
      message: "Employee created successfully",
      employee: savedEmployee,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({
        message: `Error creating Employee: ${error.message}`,
      });
    }
    return res.status(500).json({
      message: "An unknown error occurred while creating Employee",
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

  async deleteDepartment(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.body;
  
      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: 'Valid department ID is required'
        });
      }
  
      // Check if department exists
      const department = await Department.findById(id);
      if (!department) {
        return res.status(404).json({
          message: `Department with ID ${id} not found`
        });
      }
  
      // Check if there are employees assigned to this department
      const employeesCount = await Employee.countDocuments({ department_id: id });
      
      if (employeesCount > 0) {
        return res.status(400).json({
          message: 'Cannot delete department with assigned employees',
          employeesCount: employeesCount,
          solution: 'Reassign all employees to other departments before deletion'
        });
      }
  
      // Delete the department
      const deletedDepartment = await Department.findByIdAndDelete(id);
  
      return res.status(200).json({
        message: 'Department deleted successfully',
        department: deletedDepartment
      });
  
    } catch (error) {
      return res.status(500).json({
        message: 'Error deleting department',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  

  async listClients(req: Request, res: Response): Promise<Response> {
    try {
      const clients = await Client.find();

      return res.status(200).json({
        message: "clients retrieved successfully",
        data: clients
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving employees",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }


  async listProjects(req: Request, res: Response): Promise<Response> {
    try {
      const projects = await Project.find();

      return res.status(200).json({
        message: "clients retrieved successfully",
        data: projects
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving employees",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async listRoles(req: Request, res: Response): Promise<Response> {
    try {
      const roles = await Role.find();

      return res.status(200).json({
        message: "clients retrieved successfully",
        data: roles
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving employees",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

}




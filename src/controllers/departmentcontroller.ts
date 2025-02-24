import { Request, Response } from 'express';
import mongoose, { Schema, Types } from 'mongoose';
import Employee from "../models/employee";
import Department from "../models/department";
import { IDepartment } from '../dtos/departmentdto';
import { Project } from '../models/projects';
import { User } from '../dtos/userdto';


interface DepartmentUpdateFields {
    name?: string;
    description?: string;
    manager_id?: Types.ObjectId; 
}


export interface AuthRequest extends Request {
  user?: User;
}


export interface IProject extends Document {
  name: string;
  description: string;
  employees: mongoose.Types.ObjectId[];
  department_id: mongoose.Types.ObjectId;
  deadline: Date;
  created_at?: Date;
  created_by: mongoose.Types.ObjectId;
}

export class DepartmentController {
  async updateDepartment(req: Request, res: Response): Promise<Response> {
    try {
      const updateData:IDepartment = req.body;

      if(updateData.id==undefined){
        throw new Error(
            `id has to be provided`
          );
      }
      
      
      const existingDepartment = await Department.findOne({
        _id: updateData.id
      });

      if (!existingDepartment) {
        return res.status(404).json({
          message: `Department with ID ${updateData.id} not found`
        });
      }

     
      const updateFields: DepartmentUpdateFields = {};

      if (updateData.name !== undefined) {
        updateFields.name = updateData.name;
      }

      if (updateData.description !== undefined) {
        updateFields.description = updateData.description;
      }

     
      if (updateData.manager_id !== undefined) {
       
        if (!Types.ObjectId.isValid(updateData.manager_id)) {
          throw new Error(
            `Invalid manager_id format: ${updateData.manager_id}`
          );
        }
  
        const employeeExists = await Employee.exists({
          _id: new Types.ObjectId(updateData.manager_id)
        });
  
        if (!employeeExists) {
          throw new Error(
            `Employee with ID ${updateData.manager_id} not found`
          );
        }
        updateFields.manager_id = new Types.ObjectId(updateData.manager_id);
      }

     
      const updatedDepartment = await Department.findOneAndUpdate(
        { _id: updateData.id },
        { $set: updateFields },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedDepartment) {
        return res.status(500).json({
          message: 'Department update failed'
        });
      }

      return res.status(200).json({
        message: 'Department updated successfully',
        data: updatedDepartment
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error updating department",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async listDepartments(req: Request, res: Response): Promise<Response> {
    try {
      const departments = await Department.find();
  
      return res.status(200).json({
        message: "Departments retrieved successfully",
        data: departments
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving departments",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async createProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const projectData: IProject = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

     
      if (!projectData.name || !projectData.description || !projectData.deadline) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: name, description, or deadline"
        });
      }

    
      const deadlineDate = new Date(projectData.deadline);
      if (deadlineDate.getTime() < new Date().getTime()) {
        return res.status(400).json({
          success: false,
          message: "Deadline cannot be in the past"
        });
      }

      
      const department = await Department.findOne({
        _id: projectData.department_id,
        manager_id: userId
      });

      if (!department) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only department managers can create projects."
        });
      }

      if (projectData.employees && projectData.employees.length > 0) {
        const employees = await Employee.find({
          _id: { $in: projectData.employees },
          department_id: projectData.department_id
        });

        if (employees.length !== projectData.employees.length) {
          return res.status(400).json({
            success: false,
            message: "All employees must exist and belong to the specified department"
          });
        }
      }

      const project = new Project({
        name: projectData.name,
        description: projectData.description,
        employees: projectData.employees || [],
        department_id: projectData.department_id,
        deadline: deadlineDate,
        created_by: userId,
        created_at: new Date()
      });

      
      const savedProject = await project.save();

      // Populate references for response
      const populatedProject = await Project.findById(savedProject._id)
        .populate('employees', 'firstName lastName employee_id')
        .populate('department_id', 'name')
        .populate('created_by', 'firstName lastName employee_id')
        .exec();

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        project: populatedProject
      });

    } catch (error) {
      console.error('Error creating project:', error);

      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(error.errors).map(err => err.message)
        });
      }

      if (error instanceof Error) {
        if ((error as any).code === 11000) {
          return res.status(409).json({
            success: false,
            message: "Duplicate project name",
            error: "A project with this name already exists"
          });
        }

        return res.status(500).json({
          success: false,
          message: "Error creating project",
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error creating project",
        error: "Unknown error occurred"
      });
    }
  }
}
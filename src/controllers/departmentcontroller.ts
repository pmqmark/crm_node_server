import { Request, Response } from "express";
import mongoose, { Schema, Types } from "mongoose";
import Employee from "../models/employee";
import Department from "../models/department";
import { IDepartment } from "../dtos/departmentdto";
import { Project } from "../models/projects";
import { User } from "../dtos/userdto";
import { IProject } from "../models/projects";
import { Client } from "../models/client";

interface DepartmentUpdateFields {
  name?: string;
  description?: string;
  manager_id?: Types.ObjectId;
}

export interface AuthRequest extends Request {
  user?: User;
}

export class DepartmentController {
  async updateDepartment(req: Request, res: Response): Promise<Response> {
    try {
      const updateData: IDepartment = req.body;

      if (updateData.id == undefined) {
        throw new Error(`id has to be provided`);
      }

      const existingDepartment = await Department.findOne({
        _id: updateData.id,
      });

      if (!existingDepartment) {
        return res.status(404).json({
          message: `Department with ID ${updateData.id} not found`,
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
          _id: new Types.ObjectId(updateData.manager_id),
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
          runValidators: true,
        }
      );

      if (!updatedDepartment) {
        return res.status(500).json({
          message: "Department update failed",
        });
      }

      return res.status(200).json({
        message: "Department updated successfully",
        data: updatedDepartment,
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
        data: departments,
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
          message: "User not authenticated",
        });
      }

      // Check required fields based on updated interface
      if (
        !projectData.projectName ||
        !projectData.projectDescription ||
        !projectData.startDate ||
        !projectData.endDate ||
        !projectData.client
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: projectName, projectDescription, startDate, endDate, or client",
        });
      }

      // Validate dates
      const startDate = new Date(projectData.startDate);
      const endDate = new Date(projectData.endDate);
      const currentDate = new Date();

      // if (startDate.getTime() < currentDate.getTime()) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Start date cannot be in the past",
      //   });
      // }

      if (endDate.getTime() < startDate.getTime()) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
      }

      // Validate priority
      if (!["Low", "Medium", "High"].includes(projectData.priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority value. Must be 'Low', 'Medium', or 'High'",
        });
      }

      // Validate status
      if (
        !["Not Started", "In Progress", "Completed", "On Hold"].includes(
          projectData.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status value. Must be 'Not Started', 'In Progress', 'Completed', or 'On Hold'",
        });
      }

      // Validate tags if provided
      const validTags = [
        "Urgent",
        "Internal",
        "Client-Facing",
        "Research",
        "Maintenance",
      ];
      if (projectData.tags && projectData.tags.length > 0) {
        const invalidTags = projectData.tags.filter(
          (tag) => !validTags.includes(tag)
        );
        if (invalidTags.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid tags: ${invalidTags.join(", ")}`,
          });
        }
      }

      // Verify client exists
      const client = await Client.findById(projectData.client);
      if (!client) {
        return res.status(400).json({
          success: false,
          message: "Client not found",
        });
      }

      // Verify team members if provided
      if (projectData.teamMembers && projectData.teamMembers.length > 0) {
        const teamMembers = await Employee.find({
          _id: { $in: projectData.teamMembers },
        });

        if (teamMembers.length !== projectData.teamMembers.length) {
          return res.status(400).json({
            success: false,
            message: "One or more team members not found",
          });
        }
      }

      // Verify team leaders if provided
      if (projectData.teamLeaders && projectData.teamLeaders.length > 0) {
        const teamLeaders = await Employee.find({
          _id: { $in: projectData.teamLeaders },
        });

        if (teamLeaders.length !== projectData.teamLeaders.length) {
          return res.status(400).json({
            success: false,
            message: "One or more team leaders not found",
          });
        }
      }

      // Verify managers if provided
      if (projectData.managers && projectData.managers.length > 0) {
        const managers = await Employee.find({
          _id: { $in: projectData.managers },
        });

        if (managers.length !== projectData.managers.length) {
          return res.status(400).json({
            success: false,
            message: "One or more managers not found",
          });
        }
      }

      // Before creating new project check for duplication
      const existingProject = await Project.findOne({
        projectName: projectData.projectName,
        // client: projectData.client,
      });

      if (existingProject) {
        return res.status(409).json({
          success: false,
          message: "Duplicate project found",
          error: `A project named "${projectData.projectName}" already exists for this client`,
        });
      }
      // Create new project with updated schema
      const project = new Project({
        projectName: projectData.projectName,
        client: projectData.client,
        startDate: startDate,
        endDate: endDate,
        priority: projectData.priority,
        projectValue: projectData.projectValue,
        projectDescription: projectData.projectDescription,
        teamMembers: projectData.teamMembers || [],
        teamLeaders: projectData.teamLeaders || [],
        managers: projectData.managers || [],
        status: projectData.status,
        tags: projectData.tags || [],
        created_at: new Date(),
        created_by: userId,
      });

      const savedProject = await project.save();

      // Populate references for response
      const populatedProject = await Project.findById(savedProject._id)
        .populate("client", "companyName")
        .populate("teamMembers", "firstName lastName employee_id")
        .populate("teamLeaders", "firstName lastName employee_id")
        .populate("managers", "firstName lastName employee_id")
        .populate("created_by", "firstName lastName employee_id")
        .exec();

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        project: populatedProject,
      });
    } catch (error) {
      console.error("Error creating project:", error);

      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(error.errors).map((err) => err.message),
        });
      }

      if (error instanceof Error) {
        if ((error as any).code === 11000) {
          return res.status(409).json({
            success: false,
            message: "Duplicate project name",
            error: "A project with this name already exists",
          });
        }

        return res.status(500).json({
          success: false,
          message: "Error creating project",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error creating project",
        error: "Unknown error occurred",
      });
    }
  }
}

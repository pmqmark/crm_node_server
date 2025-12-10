import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import dayjs from "dayjs"; // For easier date handling
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"; // << IMPORT THE PLUGIN
import Employee from "../models/employee";
import Department from "../models/department";
import Role from "../models/role";
import { IEmployee, User } from "../dtos/userdto";
import { EmployeeUpdateFields } from "../dtos/employeedto";
import AttendanceLog from "../models/logs";
import Leave, { LeaveType } from "../models/leave";
import { Project } from "../models/projects";
import Task from "../models/tasks";
import Skill from "../models/skill";
import Todo from "../models/todo";
import Ticket from "../models/ticket";
import Admin from "../models/admin";
import { Client } from "../models/client";
import BirthdayWish from "../models/birthdayWish";
import LeaveForEmp, { ILeaveForEmp } from "../models/leaveforemp";
import Policy from "../models/policy";
import ProjectDisplay from "../models/project_display";
import ProjectDocumentation from "../models/projectDocumentation";
dayjs.extend(isSameOrAfter); // << EXTEND DAYJS WITH THE PLUGIN

export interface AuthRequest extends Request {
  user?: User;
}

interface IPopulatedProject {
  _id: Types.ObjectId;
  projectName: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  halfDay: number;
  presentPercentage: number;
  absentPercentage: number;
  halfDayPercentage: number;
  totalEmployees: number;
}

interface ITaskWithProject extends Document {
  _id: Types.ObjectId;
  project_id: IPopulatedProject;
  description: string;
  status: string;
  createdAt: Date;
}

interface IUpdatedTask {
  _id: Types.ObjectId;
  description: string;
  status: string;
  project_id?: {
    projectName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface IPopulatedDepartment {
  _id: Types.ObjectId;
  name: string;
  description: string;
}

interface IPopulatedRole {
  _id: Types.ObjectId;
  name: string;
  description: string;
}

interface TeamBirthdayEmployeeViewModel {
  employeeId: string;
  firstName: string;
  lastName: string;
  roleName: string;
  hasWishedToday: boolean;
}

export class EmployeeController {
  async updateEmployee(req: Request, res: Response): Promise<Response> {
    try {
      const updateData: EmployeeUpdateFields = req.body;

      // Validate if employee_id is provided
      if (!updateData.employee_id) {
        return res.status(400).json({
          message: "employee_id is required",
        });
      }

      // Check if employee exists
      const existingEmployee = await Employee.findOne({
        employee_id: updateData.employee_id,
      });

      if (!existingEmployee) {
        return res.status(404).json({
          message: `Employee with ID ${updateData.employee_id} not found`,
        });
      }

      const updateFields: EmployeeUpdateFields = {};

      // Map all required fields from the model
      const fields = [
        "employee_id",
        "firstName",
        "lastName",
        "phone",
        "hireDate",
        "dob",
        "addressline1",
        "addressline2",
        "city",
        "state",
        "country",
        "postalcode",
        "employeebio",
      ];

      fields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      // Handle optional reference fields
      if (updateData.department_id) {
        if (!Types.ObjectId.isValid(updateData.department_id)) {
          return res.status(400).json({
            message: `Invalid department_id format: ${updateData.department_id}`,
          });
        }

        const departmentExists = await Department.exists({
          _id: new Types.ObjectId(updateData.department_id),
        });

        if (!departmentExists) {
          return res.status(404).json({
            message: `Department with ID ${updateData.department_id} not found`,
          });
        }
        updateFields.department_id = new Types.ObjectId(
          updateData.department_id
        );
      }

      if (updateData.role_id) {
        if (!Types.ObjectId.isValid(updateData.role_id)) {
          return res.status(400).json({
            message: `Invalid role_id format: ${updateData.role_id}`,
          });
        }

        const roleExists = await Role.exists({
          _id: new Types.ObjectId(updateData.role_id),
        });

        if (!roleExists) {
          return res.status(404).json({
            message: `Role with ID ${updateData.role_id} not found`,
          });
        }
        updateFields.role_id = new Types.ObjectId(updateData.role_id);
      }

      // Update the employee without populate
      const updatedEmployee = await Employee.findOneAndUpdate(
        { employee_id: updateData.employee_id },
        { $set: updateFields },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedEmployee) {
        return res.status(500).json({
          message: "Employee update failed",
        });
      }

      return res.status(200).json({
        message: "Employee updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error updating employee",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getProjectDisplayById(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id } = req.params;

      // Validate project ID
      if (!Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID format",
        });
      }

      // Get project display content
      const projectDisplay = await ProjectDisplay.findOne({
        project_id: new Types.ObjectId(project_id),
      });

      // Check if project display exists
      if (!projectDisplay) {
        return res.status(404).json({
          success: false,
          message: "Project display content not found",
        });
      }

      // Get basic project details
      const project = await Project.findById(project_id).select(
        "projectName status startDate endDate"
      );

      return res.status(200).json({
        success: true,
        message: "Project display content retrieved successfully",
        data: {
          project_details: {
            projectName: project?.projectName,
            status: project?.status,
            startDate: project?.startDate,
            endDate: project?.endDate,
          },
          display_content: {
            _id: projectDisplay._id,
            content: projectDisplay.content,
            createdAt: projectDisplay.createdAt,
            updatedAt: projectDisplay.updatedAt,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving project display:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving project display",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async listEmployees(req: Request, res: Response): Promise<Response> {
    try {
      const employees = await Employee.find();

      return res.status(200).json({
        message: "Employees retrieved successfully",
        data: employees,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving employees",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      const { taskId, status, description } = req.body;

      if (!taskId || !Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
          message: "Invalid task ID",
        });
      }

      // Find the task and ensure the employee is assigned to it
      const task = await Task.findOne({
        _id: taskId,
        assigned_employees: req.user.id,
      });

      if (!task) {
        return res.status(404).json({
          message: "Task not found or you're not assigned to this task",
        });
      }

      // Prepare update object with type safety
      const updateData: Partial<{ status: string; description: string }> = {};

      if (status) {
        if (
          !["Pending", "In Progress", "Completed", "On Hold"].includes(status)
        ) {
          return res.status(400).json({
            message: "Invalid status value",
          });
        }
        updateData.status = status;
      }

      if (description) {
        updateData.description = description;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          message: "No valid update fields provided",
        });
      }

      // Update the task with proper type assertion
      const updatedTask = await Task.findByIdAndUpdate<IUpdatedTask>(
        taskId,
        { $set: updateData },
        { new: true }
      ).populate("project_id", "projectName");

      if (!updatedTask) {
        return res.status(500).json({
          message: "Failed to update task",
        });
      }

      return res.status(200).json({
        message: "Task updated successfully",
        data: {
          taskId: updatedTask._id,
          description: updatedTask.description,
          status: updatedTask.status,
          projectName: updatedTask.project_id?.projectName || "No Project",
          createdAt: updatedTask.createdAt,
          updatedAt: updatedTask.updatedAt,
        },
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error updating task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async listProjects(req: Request, res: Response): Promise<Response> {
    try {
      const projects = await Project.find();

      return res.status(200).json({
        message: "clients retrieved successfully",
        data: projects,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving employees",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async searchEmployee(req: Request, res: Response): Promise<Response> {
    try {
      const { id, employee_id, firstName, department_id } = req.query;
      const searchQuery: any = {};

      if (!id && !employee_id && !firstName && !department_id) {
        return res.status(400).json({
          message:
            "At least one search parameter (id, employee_id, firstName, or department_id) is required",
        });
      }

      if (id) {
        if (!Types.ObjectId.isValid(id as string)) {
          return res.status(400).json({
            message: `Invalid id format: ${id}`,
          });
        }
        searchQuery._id = new Types.ObjectId(id as string);
      }

      if (employee_id) {
        searchQuery.employee_id = employee_id;
      }

      if (firstName) {
        const searchRegex = new RegExp(firstName as string, "i");
        searchQuery.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
        ];
      }

      if (department_id) {
        if (!Types.ObjectId.isValid(department_id as string)) {
          return res.status(400).json({
            message: `Invalid department_id format: ${department_id}`,
          });
        }
        searchQuery.department_id = new Types.ObjectId(department_id as string);
      }

      const employees = await Employee.find(searchQuery)
        .populate("department_id", "name")
        .populate("role_id", "name")
        .select("-password");

      if (employees.length === 0) {
        return res.status(404).json({
          message: "No employees found matching the search criteria",
        });
      }

      return res.status(200).json({
        message: "Employees found successfully",
        count: employees.length,
        data: employees,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error searching employees",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async deleteEmployee(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.body;

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: `Invalid ID format: ${id}`,
        });
      }

      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      await Employee.findByIdAndDelete(id);

      return res.status(200).json({
        message: "Employee deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error deleting employee",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async applyLeave(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      const { leaveType, fromDate, toDate, reason } = req.body;

      // Validate required fields
      if (!leaveType || !fromDate || !toDate || !reason) {
        return res.status(400).json({
          message:
            "Missing required fields: leaveType, fromDate, toDate, and reason are required",
        });
      }

      // Validate leave type
      if (!Object.values(LeaveType).includes(leaveType)) {
        return res.status(400).json({
          message:
            "Invalid leave type. Must be one of: Medical Leave, Casual Leave, or Vacation",
        });
      }

      // Convert dates
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      // Validate dates
      if (startDate > endDate) {
        return res.status(400).json({
          message: "End date must be after start date",
        });
      }

      if (startDate < new Date()) {
        return res.status(400).json({
          message: "Cannot apply leave for past dates",
        });
      }

      // Calculate number of days
      const timeDiff = endDate.getTime() - startDate.getTime();
      const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // Check for existing leave in date range
      const existingLeave = await Leave.findOne({
        employee_id: req.user.id,
        $or: [
          {
            fromDate: { $lte: endDate },
            toDate: { $gte: startDate },
          },
        ],
      });

      if (existingLeave) {
        return res.status(400).json({
          message: "You already have a leave request for these dates",
        });
      }

      // Create leave request
      const leave = await Leave.create({
        employee_id: req.user.id,
        leaveType,
        fromDate: startDate,
        toDate: endDate,
        numberOfDays,
        reason,
        status: "Pending",
      });

      return res.status(201).json({
        message: "Leave application submitted successfully",
        data: leave,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error applying for leave",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async checkIn(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      const employee_id = req.user.id;

      // Check only if user has an active session (not checked out)
      const activeSession = await AttendanceLog.findOne({
        employee_id,
        punchOut: null,
      });

      if (activeSession) {
        return res.status(400).json({
          message: "You have an active session. Please check out first",
        });
      }

      // Create new attendance log
      const attendanceLog = await AttendanceLog.create({
        employee_id,
        date: new Date(),
        punchIn: new Date(),
        status: "Present",
      });

      return res.status(201).json({
        message: "Check-in successful",
        data: attendanceLog,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error during check-in",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async checkPunchStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      const employee_id = req.user.id;

      // Find the most recent attendance log
      const latestLog = await AttendanceLog.findOne({
        employee_id,
      })
        .sort({ date: -1, punchIn: -1 })
        .select("date punchIn punchOut status");

      if (!latestLog) {
        return res.status(200).json({
          message: "No attendance records found",
          data: {
            isPunchedIn: false,
            lastActivity: null,
          },
        });
      }

      // Check if there's an active session (no punch out)
      const isPunchedIn = latestLog.punchOut === null;

      return res.status(200).json({
        message: "Punch status retrieved successfully",
        data: {
          isPunchedIn,
          lastActivity: {
            date: latestLog.date,
            punchIn: latestLog.punchIn,
            punchOut: latestLog.punchOut,
            status: latestLog.status,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error checking punch status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getMyTasks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      const { status } = req.query;
      const query: any = {
        assigned_employees: req.user.id,
      };

      if (
        status &&
        ["Pending", "In Progress", "Completed", "On Hold"].includes(
          status as string
        )
      ) {
        query.status = status;
      }

      const tasks = await Task.find(query)
        .populate<{ project_id: IPopulatedProject }>(
          "project_id",
          "projectName"
        )
        .sort({ createdAt: -1 });

      if (tasks.length === 0) {
        return res.status(200).json({
          message: "No tasks found",
          data: [],
        });
      }

      const enrichedTasks = tasks.map((task) => ({
        taskId: task._id,
        description: task.description,
        status: task.status,
        projectName: task.project_id?.projectName || "No Project",
        createdAt: task.createdAt,
      }));

      return res.status(200).json({
        message: "Tasks retrieved successfully",
        count: enrichedTasks.length,
        data: enrichedTasks,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  // async getAssignedProjects(req: AuthRequest, res: Response): Promise<Response> {
  //   try {
  //     if (!req.user || !req.user.id) {
  //       return res.status(401).json({
  //         message: "Unauthorized: User ID is missing"
  //       });
  //     }

  //     const employeeId = req.user.id;

  //     const assignedProjects = await Project.find({
  //       $or: [
  //         { teamMembers: employeeId },
  //         { teamLeaders: employeeId },
  //         { managers: employeeId }
  //       ]
  //     })
  //     .populate<{ teamLeaders: IEmployee[] }>({
  //       path: 'teamLeaders',
  //       model: 'Employee',
  //       select: 'firstName lastName employee_id',
  //       options: { limit: 1 }
  //     })
  //     .select('projectName startDate endDate teamLeaders status')
  //     .sort({ startDate: 1 });

  //     const simplifiedProjects = assignedProjects.map(project => {
  //       const leader = project.teamLeaders?.[0];
  //       return {
  //         projectName: project.projectName,
  //         startDate: project.startDate,
  //         endDate: project.endDate,
  //         status: project.status,
  //         teamLead: leader ? {
  //           name: `${leader.firstName} ${leader.lastName}`,
  //           employeeId: leader.employee_id
  //         } : {
  //           name: 'No Lead Assigned',
  //           employeeId: null
  //         }
  //       };
  //     });

  //     return res.status(200).json({
  //       message: "Projects retrieved successfully",
  //       count: simplifiedProjects.length,
  //       data: simplifiedProjects
  //     });

  //   } catch (error) {
  //     return res.status(500).json({
  //       message: "Error retrieving assigned projects",
  //       error: error instanceof Error ? error.message : "Unknown error"
  //     });
  //   }
  // }

  // async getAssignedProjects(
  //   req: AuthRequest,
  //   res: Response
  // ): Promise<Response> {
  //   try {
  //     if (!req.user || !req.user.id) {
  //       return res.status(401).json({
  //         message: "Unauthorized: User ID is missing",
  //       });
  //     }

  //     const employeeId = req.user.id; // still string since your project stores string IDs

  //     // ✅ Find projects where this employee is assigned
  //     const assignedProjects = await Project.find({
  //       $or: [
  //         { teamMembers: employeeId },
  //         { teamLeaders: employeeId },
  //         { managers: employeeId },
  //       ],
  //     })
  //       .populate("teamLeaders", "firstName lastName employee_id")
  //       .populate("teamMembers", "firstName lastName employee_id")
  //       .populate("managers", "firstName lastName employee_id")
  //       .select(
  //         "projectName startDate endDate teamLeaders teamMembers managers status"
  //       )
  //       .sort({ startDate: 1 })
  //       .lean();

  //     // ✅ Format response without tasks
  //     const projects = assignedProjects.map((project: any) => ({
  //       projectName: project.projectName,
  //       startDate: project.startDate,
  //       endDate: project.endDate,
  //       status: project.status,
  //       teamLeaders: (project.teamLeaders ?? []).map((leader: any) => ({
  //         name: `${leader.firstName} ${leader.lastName}`,
  //         employeeId: leader.employee_id,
  //       })),
  //       teamMembers: (project.teamMembers ?? []).map((member: any) => ({
  //         name: `${member.firstName} ${member.lastName}`,
  //         employeeId: member.employee_id,
  //       })),
  //       managers: (project.managers ?? []).map((manager: any) => ({
  //         name: `${manager.firstName} ${manager.lastName}`,
  //         employeeId: manager.employee_id,
  //       })),
  //     }));

  //     return res.status(200).json({
  //       message: "Projects retrieved successfully",
  //       count: projects.length,
  //       data: projects,
  //     });
  //   } catch (error) {
  //     console.error("Error in getAssignedProjects:", error);
  //     return res.status(500).json({
  //       message: "Error retrieving projects",
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //   }
  // }
  async getAssignedProjects(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;

      // --- PAGINATION IMPLEMENTATION START ---
      // 1. Extract and Validate Pagination Parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // 2. Define the Base Query
      const baseQuery = {
        $or: [
          { teamMembers: employeeId },
          { teamLeaders: employeeId },
          { managers: employeeId },
        ],
      };

      // 3. Count Total Documents (for pagination metadata)
      const totalProjects = await Project.countDocuments(baseQuery);
      const totalPages = Math.ceil(totalProjects / limit);
      // --- PAGINATION IMPLEMENTATION END ---

      // 4. Fetch Projects with Skip and Limit
      const assignedProjects = await Project.find(baseQuery)
        .populate("client", "companyName")
        .populate("teamLeaders", "firstName lastName employee_id")
        .populate("teamMembers", "firstName lastName employee_id")
        .populate("managers", "firstName lastName employee_id")
        .select(
          "projectName startDate endDate status priority projectValue projectDescription client teamLeaders teamMembers managers"
        )
        .sort({ startDate: 1 })
        .skip(skip) // <-- Apply skip for offset
        .limit(limit) // <-- Apply limit for page size
        .lean();

      // 5. Format Projects
      const projects = assignedProjects.map((project: any) => ({
        projectId: project._id,
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        priority: project.priority,
        projectValue: project.projectValue,
        client: project.client
          ? { name: project.client.companyName }
          : { name: "Unknown Client" },
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,

        teamLeaders: (project.teamLeaders ?? []).map((leader: any) => ({
          name: `${leader.firstName} ${leader.lastName}`,
          employeeId: leader.employee_id,
        })),

        teamMembers: (project.teamMembers ?? []).map((member: any) => ({
          name: `${member.firstName} ${member.lastName}`,
          employeeId: member.employee_id,
        })),

        managers: (project.managers ?? []).map((manager: any) => ({
          name: `${manager.firstName} ${manager.lastName}`,
          employeeId: manager.employee_id,
        })),
      }));

      // 6. Success Response with Pagination Metadata
      return res.status(200).json({
        message: "Projects retrieved successfully",
        count: projects.length, // Only the count of projects on the current page
        totalProjects: totalProjects, // Total count across all pages
        currentPage: page,
        totalPages: totalPages,
        data: projects,
      });
    } catch (error) {
      console.error("Error in getAssignedProjects:", error);
      return res.status(500).json({
        message: "Error retrieving projects",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getAttendanceLogs(req: Request, res: Response): Promise<Response> {
    try {
      const { employee_id, startDate, endDate, status } = req.query;

      const query: any = {};

      // Filter by employee_id if provided
      if (employee_id) {
        query.employee_id = employee_id;
      }

      // Filter by date range if provided
      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          query.date.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.date.$lte = new Date(endDate as string);
        }
      }

      // Filter by status if provided
      if (status) {
        query.status = status;
      }

      const attendanceLogs = await AttendanceLog.find(query).sort({
        date: -1,
        punchIn: -1,
      });

      // Get employee details separately if needed
      const employeeIds = [
        ...new Set(attendanceLogs.map((log) => log.employee_id)),
      ];
      const employees = await Employee.find({
        employee_id: { $in: employeeIds },
      }).select("employee_id firstName lastName");

      // Create employee lookup map
      const employeeMap = new Map(
        employees.map((emp) => [emp.employee_id, emp])
      );

      // Combine attendance logs with employee details
      const enrichedLogs = attendanceLogs.map((log) => ({
        ...log.toObject(),
        employeeDetails: employeeMap.get(log.employee_id.toString()) || null,
      }));

      // Calculate summary statistics
      const summary = {
        totalRecords: enrichedLogs.length,
        present: enrichedLogs.filter((log) => log.status === "Present").length,
        absent: enrichedLogs.filter((log) => log.status === "Absent").length,
        halfDay: enrichedLogs.filter((log) => log.status === "Half-Day").length,
        averageHours:
          enrichedLogs.reduce((acc, log) => acc + (log.totalHours || 0), 0) /
            enrichedLogs.length || 0,
      };

      return res.status(200).json({
        message: "Attendance logs retrieved successfully",
        summary,
        data: enrichedLogs,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving attendance logs",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getDailyAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyStats = await this.getAttendanceStats(today, new Date());

      return res.status(200).json({
        message: "Daily attendance retrieved successfully",
        date: today.toISOString().split("T")[0],
        data: dailyStats,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving daily attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getWeeklyAttendance1(req: Request, res: Response): Promise<Response> {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyStats = await this.getAttendanceStats(
        startOfWeek,
        new Date()
      );

      return res.status(200).json({
        message: "Weekly attendance retrieved successfully",
        startDate: startOfWeek.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
        data: weeklyStats,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving weekly attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getMonthlyAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const monthlyStats = await this.getAttendanceStats(
        startOfMonth,
        new Date()
      );

      return res.status(200).json({
        message: "Monthly attendance retrieved successfully",
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
        data: monthlyStats,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving monthly attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getLeavepolicyForEmp(req: Request, res: Response): Promise<Response> {
    try {
      const { isSpecific, isHoliday, isDefault } = req.query;
      const query: any = {};

      // Build query based on filters
      if (typeof isSpecific === "string") {
        query.isSpecific = isSpecific.toLowerCase() === "true";
      }
      if (typeof isHoliday === "string") {
        query.isHoliday = isHoliday.toLowerCase() === "true";
      }
      if (typeof isDefault === "string") {
        query.isDefault = isDefault.toLowerCase() === "true";
      }

      // Get leaves based on filters
      const leaves = await LeaveForEmp.find(query).sort({ updatedAt: -1 });

      // Group and format the response
      const formattedResponse = {
        defaultLeave: [] as any[],
        holidays: [] as any[],
        specificLeaves: [] as any[],
      };

      leaves.forEach((leave) => {
        const leaveData = {
          _id: leave._id,
          name: leave.name,
          description: leave.description,
          days: leave.days,
          year: leave.year,
          holidayDate: leave.holidayDate,
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
        };

        if (leave.isDefault) {
          formattedResponse.defaultLeave.push(leaveData);
        } else if (leave.isHoliday) {
          formattedResponse.holidays.push(leaveData);
        } else if (leave.isSpecific) {
          formattedResponse.specificLeaves.push(leaveData);
        }
      });

      // Calculate summary
      const summary = {
        total: leaves.length,
        defaultCount: formattedResponse.defaultLeave.length,
        holidaysCount: formattedResponse.holidays.length,
        specificLeavesCount: formattedResponse.specificLeaves.length,
      };

      return res.status(200).json({
        success: true,
        message: "Leave configurations retrieved successfully",
        summary,
        data: formattedResponse,
      });
    } catch (error) {
      console.error("Error retrieving leave configurations:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving leave configurations",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getLeaveById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      // Validate leave ID
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid leave ID format",
        });
      }

      // Find leave by ID
      const leave = await LeaveForEmp.findById(id);

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave configuration not found",
        });
      }

      // Format response
      const formattedLeave = {
        _id: leave._id,
        name: leave.name,
        description: leave.description,
        days: leave.days,
        year: leave.year,
        isDefault: leave.isDefault,
        isHoliday: leave.isHoliday,
        isSpecific: leave.isSpecific,
        holidayDate: leave.holidayDate,
        createdAt: leave.createdAt,
        updatedAt: leave.updatedAt,
      };

      return res.status(200).json({
        success: true,
        message: "Leave configuration retrieved successfully",
        data: formattedLeave,
      });
    } catch (error) {
      console.error("Error retrieving leave configuration:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving leave configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async getAttendanceStats(
    startDate: Date,
    endDate: Date
  ): Promise<AttendanceStats> {
    try {
      // Get total number of employees
      const totalEmployees = await Employee.countDocuments();

      // Get attendance records for the period
      const attendanceCounts = await AttendanceLog.aggregate([
        {
          $match: {
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        present: 0,
        absent: 0,
        halfDay: 0,
        presentPercentage: 0,
        absentPercentage: 0,
        halfDayPercentage: 0,
        totalEmployees,
      };

      attendanceCounts.forEach((item) => {
        switch (item._id) {
          case "Present":
            stats.present = item.count;
            break;
          case "Half-Day":
            stats.halfDay = item.count;
            break;
        }
      });

      // Calculate absent as total employees minus (present + half-day)
      stats.absent = totalEmployees - (stats.present + stats.halfDay);

      // Ensure absent count doesn't go below 0
      stats.absent = Math.max(0, stats.absent);

      // Calculate percentages
      stats.presentPercentage =
        totalEmployees > 0 ? (stats.present / totalEmployees) * 100 : 0;
      stats.halfDayPercentage =
        totalEmployees > 0 ? (stats.halfDay / totalEmployees) * 100 : 0;
      stats.absentPercentage =
        totalEmployees > 0 ? (stats.absent / totalEmployees) * 100 : 0;

      return stats;
    } catch (error) {
      console.error("Error calculating attendance stats:", error);
      throw error;
    }
  }

  async assignTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      // Check if user has permission to assign tasks
      const assigningEmployee = await Employee.findById(req.user.id).select(
        "role_id"
      );

      if (!assigningEmployee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      // Check if employee has the restricted role
      if (
        assigningEmployee.role_id?.toString() === "67eda86ae2b85e32ef56e328"
      ) {
        return res.status(403).json({
          message: "You don't have permission to assign tasks",
        });
      }
      const {
        project_id,
        assigned_employees, // Array of employee _ids
        description,
        status = "Pending",
      } = req.body;

      // Validate required fields
      if (!project_id || !Array.isArray(assigned_employees) || !description) {
        return res.status(400).json({
          message:
            "Project ID, assigned employees array, and description are required",
        });
      }

      // Validate project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Validate all employee IDs are valid ObjectIds
      const validObjectIds = assigned_employees.every((id) =>
        Types.ObjectId.isValid(id)
      );
      if (!validObjectIds) {
        return res.status(400).json({
          message: "One or more employee IDs are not valid ObjectIds",
        });
      }

      // Validate employees exist using _id
      const validEmployees = await Employee.find({
        _id: { $in: assigned_employees.map((id) => new Types.ObjectId(id)) },
      }).select("_id firstName lastName");

      if (validEmployees.length !== assigned_employees.length) {
        const foundIds = validEmployees.map((emp) => emp._id.toString());
        const invalidIds = assigned_employees.filter(
          (id) => !foundIds.includes(id)
        );

        return res.status(400).json({
          message: "Some employee IDs are invalid",
          invalidEmployees: invalidIds,
        });
      }

      // Create new task
      const task = new Task({
        project_id,
        assigned_employees,
        description,
        status,
      });

      const savedTask = await task.save();

      // Return response with employee details
      return res.status(201).json({
        message: "Task assigned successfully",
        data: {
          ...savedTask.toObject(),
          assignedEmployeeDetails: validEmployees.map((emp) => ({
            _id: emp._id,
            name: `${emp.firstName} ${emp.lastName}`,
          })),
        },
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error assigning task",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getPolicy(req: Request, res: Response): Promise<Response> {
    try {
      // Get the latest policy document
      const policy = await Policy.findOne().sort({ updatedAt: -1 });

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: "No policy found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Policy retrieved successfully",
        data: {
          title: policy.title,
          content: policy.content,
          dated: policy.dated,
          updatedAt: policy.updatedAt,
          createdAt: policy.createdAt,
        },
      });
    } catch (error) {
      console.error("Error retrieving policy:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving policy",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async checkOut(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      const employee_id = req.user.id;

      // Find active session
      const activeSession = await AttendanceLog.findOne({
        employee_id,
        punchOut: null,
      });

      if (!activeSession) {
        return res.status(404).json({
          message: "No active session found. Please check in first",
        });
      }

      // Update punch-out time
      activeSession.punchOut = new Date();
      await activeSession.save(); // This will trigger the pre-save hook to calculate hours

      return res.status(200).json({
        message: "Check-out successful",
        data: activeSession,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error during check-out",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async findEmployee(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing",
        });
      }

      console.log(req.user);

      const userId = req.user.id;

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: `Invalid user ID format: ${userId}`,
        });
      }

      const employee = await Employee.findById(userId)
        .populate("department_id", "name")
        .populate("role_id", "name")
        .select("-password");

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      return res.status(200).json({
        message: "Employee found successfully",
        data: employee,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error finding employee",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get leave history for the current employee
   * Shows all leave requests with status and provides summary statistics
   */
  async getMyLeaveHistory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;

      interface IPopulatedEmployee {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
        employee_id: string;
      }

      // Find all leave requests for this employee
      const leaves = await Leave.find({
        employee_id: new Types.ObjectId(employeeId),
      })
        .sort({ createdAt: -1 })
        .populate<{ approvedBy: IPopulatedEmployee }>(
          "approvedBy",
          "firstName lastName employee_id"
        );

      if (leaves.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No leave records found",
          data: {
            summary: {
              totalRequests: 0,
              approved: 0,
              rejected: 0,
              pending: 0,
              byType: {
                medical: 0,
                casual: 0,
                vacation: 0,
              },
              totalDaysTaken: 0,
            },
            leaveHistory: [],
          },
        });
      }

      // Calculate summary statistics
      const summary = {
        totalRequests: leaves.length,
        approved: leaves.filter((leave) => leave.status === "Approved").length,
        rejected: leaves.filter((leave) => leave.status === "Rejected").length,
        pending: leaves.filter((leave) => leave.status === "Pending").length,
        byType: {
          medical: leaves.filter(
            (leave) => leave.leaveType === LeaveType.MEDICAL
          ).length,
          casual: leaves.filter((leave) => leave.leaveType === LeaveType.CASUAL)
            .length,
          vacation: leaves.filter(
            (leave) => leave.leaveType === LeaveType.VACATION
          ).length,
        },
        totalDaysTaken: leaves
          .filter((leave) => leave.status === "Approved")
          .reduce((total, leave) => total + leave.numberOfDays, 0),
      };

      // Format the leaves data for the response
      const formattedLeaves = leaves.map((leave) => {
        const formattedLeave = {
          id: leave._id,
          leaveType: leave.leaveType,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          numberOfDays: leave.numberOfDays,
          reason: leave.reason,
          status: leave.status,
          comments: leave.comments || null,
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
          approvedBy: leave.approvedBy
            ? {
                id: leave.approvedBy._id,
                name: `${leave.approvedBy.firstName} ${leave.approvedBy.lastName}`,
                employee_id: leave.approvedBy.employee_id,
              }
            : null,
        };

        return formattedLeave;
      });

      // Check for upcoming leave
      const today = new Date();
      const upcomingLeave = leaves.find(
        (leave) =>
          leave.status === "Approved" && new Date(leave.fromDate) > today
      );

      // Check for ongoing leave
      const ongoingLeave = leaves.find(
        (leave) =>
          leave.status === "Approved" &&
          new Date(leave.fromDate) <= today &&
          new Date(leave.toDate) >= today
      );

      // Add status indicators
      const leaveStatus = {
        hasUpcomingLeave: !!upcomingLeave,
        upcomingLeave: upcomingLeave
          ? {
              id: upcomingLeave._id,
              leaveType: upcomingLeave.leaveType,
              fromDate: upcomingLeave.fromDate,
              toDate: upcomingLeave.toDate,
              daysRemaining: Math.ceil(
                (new Date(upcomingLeave.fromDate).getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24)
              ),
            }
          : null,
        isCurrentlyOnLeave: !!ongoingLeave,
        ongoingLeave: ongoingLeave
          ? {
              id: ongoingLeave._id,
              leaveType: ongoingLeave.leaveType,
              fromDate: ongoingLeave.fromDate,
              toDate: ongoingLeave.toDate,
              daysRemaining: Math.ceil(
                (new Date(ongoingLeave.toDate).getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24)
              ),
            }
          : null,
      };

      return res.status(200).json({
        success: true,
        message: "Leave history retrieved successfully",
        data: {
          summary,
          leaveStatus,
          leaveHistory: formattedLeaves,
        },
      });
    } catch (error) {
      console.error("Error retrieving leave history:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving leave history",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getMyProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const userId = req.user.id;

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid user ID format: ${userId}`,
        });
      }

      // Get employee with populated references using proper TypeScript generics
      const employee = await Employee.findById(userId)
        .populate<{ department_id: IPopulatedDepartment }>(
          "department_id",
          "name description"
        )
        .populate<{ role_id: IPopulatedRole }>("role_id", "name description")
        .select("-password"); // Exclude password

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found",
        });
      }

      // Format the response
      const profileData = {
        id: employee._id,
        employee_id: employee.employee_id,
        name: `${employee.firstName} ${employee.lastName}`,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        department: employee.department_id
          ? {
              id: employee.department_id._id,
              name: employee.department_id.name,
              description: employee.department_id.description,
            }
          : null,
        role: employee.role_id
          ? {
              id: employee.role_id._id,
              name: employee.role_id.name,
              description: employee.role_id.description,
            }
          : null,
        hireDate: employee.hireDate,
        dob: employee.dob,
        address: {
          addressline1: employee.addressline1,
          addressline2: employee.addressline2,
          city: employee.city,
          state: employee.state,
          country: employee.country,
          postalcode: employee.postalcode,
        },
        bio: employee.employeebio,
        createdAt: employee.createdAt,
        lastLogin: employee.lastLogin,
      };

      return res.status(200).json({
        success: true,
        message: "Employee profile retrieved successfully",
        data: profileData,
      });
    } catch (error) {
      console.error("Error retrieving employee profile:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving employee profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all colleagues in the same department, properly sorted and deduplicated
   * Returns department manager first, then team leads, then regular employees
   * Includes current user information
   */
  async getDepartmentColleagues(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;

      // Get the current employee with their role details
      const currentEmployee = await Employee.findById(employeeId)
        .populate("role_id", "name")
        .populate("department_id", "name description");

      if (!currentEmployee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      // Check if employee has a department assigned
      if (!currentEmployee.department_id) {
        return res.status(400).json({
          success: false,
          message: "You are not assigned to any department",
        });
      }

      // Safe way to access department_id properties with proper type handling
      const departmentId =
        typeof currentEmployee.department_id === "string"
          ? currentEmployee.department_id
          : (currentEmployee.department_id as any)._id;

      // Get department details including the manager
      const department = await Department.findById(departmentId).populate(
        "manager_id",
        "firstName lastName employee_id email phone"
      );

      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }

      // Find all employees in the same department (including current user)
      const departmentEmployees = await Employee.find({
        department_id: departmentId,
      })
        .populate("role_id", "name")
        .select("firstName lastName employee_id email phone role_id")
        .lean();

      // Get all roles to check for team leads
      const roles = await Role.find({});

      // Identify team lead roles (contains 'lead' or 'senior' in name)
      const teamLeadRoleIds = roles
        .filter(
          (role) =>
            role.name.toLowerCase().includes("lead") ||
            role.name.toLowerCase().includes("senior")
        )
        .map((role) => role._id.toString());

      // Create a set of processed IDs to avoid duplicates
      const processedEmployeeIds = new Set<string>();
      const formattedEmployees: any[] = [];

      // First, add the manager if exists (and not the current employee)
      if (department.manager_id) {
        // Safe way to handle manager_id with proper type checking
        const managerId =
          typeof department.manager_id === "string"
            ? department.manager_id
            : (department.manager_id as any)._id.toString();

        const manager = departmentEmployees.find(
          (emp) => emp._id.toString() === managerId
        );

        if (manager) {
          // Don't exclude the manager if they're the current employee - we'll handle this specifically
          processedEmployeeIds.add(managerId);

          const roleObj =
            manager.role_id && typeof manager.role_id !== "string"
              ? manager.role_id
              : null;
          const roleName =
            roleObj && (roleObj as any).name
              ? (roleObj as any).name
              : "Department Manager";

          formattedEmployees.push({
            id: manager._id,
            name: `${manager.firstName || ""} ${manager.lastName || ""}`.trim(),
            employee_id: manager.employee_id || "",
            email: manager.email || "",
            phone: manager.phone || "",
            role: roleName,
            isManager: true,
            isTeamLead: false,
          });
        }
      }

      // Add team leads next (not already added, not the current employee)
      departmentEmployees.forEach((emp) => {
        // Skip if already processed
        if (processedEmployeeIds.has(emp._id.toString())) {
          return;
        }

        let isTeamLead = false;
        let roleName = "No Role";

        if (emp.role_id) {
          // Safe way to handle role_id with proper type checking
          const roleObj = typeof emp.role_id !== "string" ? emp.role_id : null;
          roleName =
            roleObj && (roleObj as any).name
              ? (roleObj as any).name
              : "No Role";

          const roleId = roleObj ? (roleObj as any)._id.toString() : "";
          isTeamLead = teamLeadRoleIds.includes(roleId);
        }

        // Only add team leads in this pass
        if (isTeamLead) {
          processedEmployeeIds.add(emp._id.toString());

          formattedEmployees.push({
            id: emp._id,
            name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            employee_id: emp.employee_id || "",
            email: emp.email || "",
            phone: emp.phone || "",
            role: roleName,
            isManager: false,
            isTeamLead: true,
          });
        }
      });

      // Add remaining regular employees (alphabetically)
      const regularEmployees = departmentEmployees
        .filter((emp) => !processedEmployeeIds.has(emp._id.toString()))
        .sort((a, b) => {
          const aName = a.firstName || "";
          const bName = b.firstName || "";
          return aName.localeCompare(bName);
        });

      regularEmployees.forEach((emp) => {
        let roleName = "No Role";

        if (emp.role_id) {
          // Safe way to handle role_id with proper type checking
          const roleObj = typeof emp.role_id !== "string" ? emp.role_id : null;
          roleName =
            roleObj && (roleObj as any).name
              ? (roleObj as any).name
              : "No Role";
        }

        formattedEmployees.push({
          id: emp._id,
          name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
          employee_id: emp.employee_id || "",
          email: emp.email || "",
          phone: emp.phone || "",
          role: roleName,
          isManager: false,
          isTeamLead: false,
        });
      });

      // Extract the current employee
      const currentEmployeeInfo = formattedEmployees.find(
        (emp) => emp.id.toString() === employeeId.toString()
      );

      // Remove current employee from colleagues list
      const colleagues = formattedEmployees.filter(
        (emp) => emp.id.toString() !== employeeId.toString()
      );

      // Get role info for current user using type-safe approach
      let currentUserRole = "No Role";
      let isCurrentUserManager = false;
      let isCurrentUserTeamLead = false;

      if (currentEmployee.role_id) {
        // Safe way to handle role_id with proper type checking
        const roleObj = currentEmployee.role_id;
        currentUserRole =
          typeof roleObj === "string"
            ? "No Role"
            : (roleObj as any).name || "No Role";

        // Check if team lead
        const roleId =
          typeof roleObj === "string"
            ? roleObj
            : (roleObj as any)._id.toString();

        if (roleId && teamLeadRoleIds.includes(roleId)) {
          isCurrentUserTeamLead = true;
        }
      }

      // Check if department manager with proper type safety
      if (department.manager_id) {
        const managerId =
          typeof department.manager_id === "string"
            ? department.manager_id
            : (department.manager_id as any)._id.toString();

        isCurrentUserManager = managerId === employeeId.toString();
      }

      // Safe way to access department properties
      const departmentName = department.name || "";
      const departmentDescription = department.description || "";

      return res.status(200).json({
        success: true,
        message: "Department colleagues retrieved successfully",
        data: {
          department: {
            id: department._id,
            name: departmentName,
            description: departmentDescription,
          },
          currentUser: {
            id: currentEmployee._id,
            name: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
            employee_id: currentEmployee.employee_id,
            email: currentEmployee.email,
            phone: currentEmployee.phone || "",
            role: currentUserRole,
            isManager: isCurrentUserManager,
            isTeamLead: isCurrentUserTeamLead,
          },
          colleagues,
        },
      });
    } catch (error) {
      console.error("Error retrieving department colleagues:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving department colleagues",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Add a new skill for the employee
   */
  async addSkill(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { name, proficiency } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Skill name is required",
        });
      }

      // Validate proficiency is one of the allowed values
      const allowedProficiencies = [0, 25, 50, 75, 100];
      const proficiencyValue = proficiency ? Number(proficiency) : 0;

      if (!allowedProficiencies.includes(proficiencyValue)) {
        return res.status(400).json({
          success: false,
          message: "Proficiency must be one of: 0, 25, 50, 75, 100",
        });
      }

      // Check if skill already exists for this employee
      const existingSkill = await Skill.findOne({
        employee_id: new Types.ObjectId(employeeId),
        name: name,
      });

      if (existingSkill) {
        return res.status(400).json({
          success: false,
          message:
            "You already have this skill registered. Use update instead.",
        });
      }

      // Create the skill
      const skill = new Skill({
        employee_id: new Types.ObjectId(employeeId),
        name,
        proficiency: proficiencyValue,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedSkill = await skill.save();

      return res.status(201).json({
        success: true,
        message: "Skill added successfully",
        data: {
          id: savedSkill._id,
          name: savedSkill.name,
          proficiency: savedSkill.proficiency,
          created_at: savedSkill.created_at,
          updated_at: savedSkill.updated_at,
        },
      });
    } catch (error) {
      console.error("Error adding skill:", error);
      return res.status(500).json({
        success: false,
        message: "Error adding skill",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update an existing skill's proficiency
   */
  async updateSkill(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { skillId, proficiency } = req.body;

      // Validate required fields
      if (!skillId || !Types.ObjectId.isValid(skillId)) {
        return res.status(400).json({
          success: false,
          message: "Valid skill ID is required",
        });
      }

      // Validate proficiency is one of the allowed values
      const allowedProficiencies = [0, 25, 50, 75, 100];
      const proficiencyValue = Number(proficiency);

      if (!allowedProficiencies.includes(proficiencyValue)) {
        return res.status(400).json({
          success: false,
          message: "Proficiency must be one of: 0, 25, 50, 75, 100",
        });
      }

      // Find the skill and ensure it belongs to the employee
      const skill = await Skill.findOne({
        _id: new Types.ObjectId(skillId),
        employee_id: new Types.ObjectId(employeeId),
      });

      if (!skill) {
        return res.status(404).json({
          success: false,
          message: "Skill not found or you don't have permission to edit it",
        });
      }

      // Update the skill
      skill.proficiency = proficiencyValue;
      skill.updated_at = new Date();
      await skill.save();

      return res.status(200).json({
        success: true,
        message: "Skill updated successfully",
        data: {
          id: skill._id,
          name: skill.name,
          proficiency: skill.proficiency,
          created_at: skill.created_at,
          updated_at: skill.updated_at,
        },
      });
    } catch (error) {
      console.error("Error updating skill:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating skill",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete an existing skill
   */
  async deleteSkill(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { skillId } = req.body;

      // Validate required fields
      if (!skillId || !Types.ObjectId.isValid(skillId)) {
        return res.status(400).json({
          success: false,
          message: "Valid skill ID is required",
        });
      }

      // Find and delete the skill, ensuring it belongs to the employee
      const result = await Skill.findOneAndDelete({
        _id: new Types.ObjectId(skillId),
        employee_id: new Types.ObjectId(employeeId),
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Skill not found or you don't have permission to delete it",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Skill deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting skill:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting skill",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all skills for the current employee
   */
  async getMySkills(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;

      // Find all skills for this employee, sorted by name
      const skills = await Skill.find({
        employee_id: new Types.ObjectId(employeeId),
      }).sort({ name: 1 });

      return res.status(200).json({
        success: true,
        message: "Skills retrieved successfully",
        data: skills,
      });
    } catch (error) {
      console.error("Error retrieving skills:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving skills",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all todos for the logged-in employee
   * Optionally filter by view (my day, important)
   */
  async getMyTodos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { view } = req.query;

      // Build query based on the employee ID
      const query: any = {
        employee_id: new Types.ObjectId(employeeId),
      };

      // Add filters based on view parameter
      if (view === "myday") {
        query.isMyDay = true;
      } else if (view === "important") {
        query.isImportant = true;
      }

      // Find todos matching the query
      const todos = await Todo.find(query).sort({ created_at: -1 });

      // Calculate summary statistics
      const summary = {
        total: todos.length,
        completed: todos.filter((todo) => todo.completed).length,
        remaining: todos.filter((todo) => !todo.completed).length,
        withDueDate: todos.filter((todo) => todo.dueDate).length,
        myDay: todos.filter((todo) => todo.isMyDay).length,
        important: todos.filter((todo) => todo.isImportant).length,
      };

      return res.status(200).json({
        success: true,
        message: "Todos retrieved successfully",
        summary,
        data: todos,
      });
    } catch (error) {
      console.error("Error retrieving todos:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving todos",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Create a simple todo task (without subtasks)
   */
  async createTodo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { title } = req.body;

      // Validate required field
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Todo title is required",
        });
      }

      // Create basic todo item (without subtasks)
      const todo = new Todo({
        employee_id: employeeId,
        title,
        completed: false,
        isImportant: false,
        isMyDay: false,
        subtasks: [],
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedTodo = await todo.save();

      return res.status(201).json({
        success: true,
        message: "Todo created successfully",
        data: savedTodo,
      });
    } catch (error) {
      console.error("Error creating todo:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating todo",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Edit a todo - add subtasks, set due date, reminder, important flag, my day flag
   */
  async editTodo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { todoId } = req.params;
      const {
        title,
        completed,
        isImportant,
        isMyDay,
        dueDate,
        reminderDate,
        subtasks,
        addSubtasks,
        removeSubtaskIds,
      } = req.body;

      // Validate todoId
      if (!todoId || !Types.ObjectId.isValid(todoId)) {
        return res.status(400).json({
          success: false,
          message: "Valid todo ID is required",
        });
      }

      // Find the todo
      const todo = await Todo.findOne({
        _id: new Types.ObjectId(todoId),
        employee_id: new Types.ObjectId(employeeId),
      });

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: "Todo not found",
        });
      }

      // Update fields if provided
      if (title !== undefined) todo.title = title;
      if (completed !== undefined) todo.completed = completed;
      if (isImportant !== undefined) todo.isImportant = isImportant;
      if (isMyDay !== undefined) todo.isMyDay = isMyDay;

      // Handle date fields
      if (dueDate !== undefined) {
        todo.dueDate = dueDate ? new Date(dueDate) : null;
      }

      if (reminderDate !== undefined) {
        todo.reminderDate = reminderDate ? new Date(reminderDate) : null;
      }

      // Handle complete replacement of subtasks array
      if (subtasks && Array.isArray(subtasks)) {
        todo.subtasks = subtasks.map((subtask) => ({
          title: subtask.title,
          completed: subtask.completed || false,
        }));
      }

      // Handle adding individual subtasks (more flexible approach)
      if (addSubtasks && Array.isArray(addSubtasks)) {
        const newSubtasks = addSubtasks.map((subtask) => ({
          title: subtask.title,
          completed: subtask.completed || false,
        }));

        todo.subtasks = [...todo.subtasks, ...newSubtasks];
      }

      // Handle removing specific subtasks
      if (
        removeSubtaskIds &&
        Array.isArray(removeSubtaskIds) &&
        removeSubtaskIds.length > 0
      ) {
        todo.subtasks = todo.subtasks.filter(
          (subtask) => !removeSubtaskIds.includes(subtask._id?.toString() || "")
        );
      }

      // Update the modified timestamp
      todo.updated_at = new Date();

      // Save the updated todo
      await todo.save();

      return res.status(200).json({
        success: true,
        message: "Todo updated successfully",
        data: todo,
      });
    } catch (error) {
      console.error("Error updating todo:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating todo",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Toggle todo completion status (complete/incomplete)
   * When marking a todo as complete, all subtasks are marked as completed
   * When marking a todo as incomplete, all subtasks are marked as incomplete
   */
  async toggleTodo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { todoId } = req.body;

      // Validate todoId
      if (!todoId || !Types.ObjectId.isValid(todoId)) {
        return res.status(400).json({
          success: false,
          message: "Valid todo ID is required",
        });
      }

      // Find the todo
      const todo = await Todo.findOne({
        _id: new Types.ObjectId(todoId),
        employee_id: new Types.ObjectId(employeeId),
      });

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: "Todo not found",
        });
      }

      // Toggle completed status
      todo.completed = !todo.completed;

      // If the todo has subtasks, update all subtask statuses to match the parent todo's status
      if (todo.subtasks && todo.subtasks.length > 0) {
        todo.subtasks = todo.subtasks.map((subtask) => ({
          ...subtask,
          completed: todo.completed,
        }));
      }

      // Update the modified timestamp
      todo.updated_at = new Date();

      await todo.save();

      return res.status(200).json({
        success: true,
        message: `Todo marked as ${
          todo.completed ? "completed" : "incomplete"
        }${
          todo.subtasks.length > 0
            ? todo.completed
              ? " (all subtasks also completed)"
              : " (all subtasks also marked incomplete)"
            : ""
        }`,
        data: todo,
      });
    } catch (error) {
      console.error("Error toggling todo status:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating todo status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete a todo
   */
  async deleteTodo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { todoId } = req.body;

      // Validate todoId
      if (!todoId || !Types.ObjectId.isValid(todoId)) {
        return res.status(400).json({
          success: false,
          message: "Valid todo ID is required",
        });
      }

      // Delete the todo
      const result = await Todo.findOneAndDelete({
        _id: new Types.ObjectId(todoId),
        employee_id: new Types.ObjectId(employeeId),
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Todo not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Todo deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting todo:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting todo",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get employee's attendance summary analytics
   */
  async getAttendanceAnalytics(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;

      // Get date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Start of current week (Sunday)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Start of current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get today's attendance record
      const todayAttendance = await AttendanceLog.findOne({
        employee_id: employeeId,
        date: { $gte: today, $lt: tomorrow },
      });

      // Calculate today's hours
      let hoursToday = 0;
      let currentStatus = "Not Checked In";
      let isPunchedIn = false;

      if (todayAttendance) {
        if (todayAttendance.punchOut) {
          // Completed shift
          hoursToday = todayAttendance.totalHours;
          currentStatus = todayAttendance.status;
        } else {
          // Still punched in - calculate hours up to now
          isPunchedIn = true;
          const now = new Date();
          hoursToday = Number(
            (
              (now.getTime() - todayAttendance.punchIn.getTime()) /
              (1000 * 60 * 60)
            ).toFixed(2)
          );
          currentStatus = "Working";
        }
      }

      // Get weekly hours
      const weeklyLogs = await AttendanceLog.find({
        employee_id: employeeId,
        date: { $gte: startOfWeek, $lt: tomorrow },
      });

      let hoursThisWeek = 0;
      weeklyLogs.forEach((log) => {
        if (log.punchOut) {
          hoursThisWeek += log.totalHours;
        }
      });

      // Add today's ongoing hours if still punched in
      if (isPunchedIn) {
        hoursThisWeek += hoursToday;
      }

      // Get monthly hours and attendance status counts
      const monthlyLogs = await AttendanceLog.find({
        employee_id: employeeId,
        date: { $gte: startOfMonth, $lt: tomorrow },
      });

      let hoursThisMonth = 0;
      monthlyLogs.forEach((log) => {
        if (log.punchOut) {
          hoursThisMonth += log.totalHours;
        }
      });

      // Add today's ongoing hours if still punched in
      if (isPunchedIn) {
        hoursThisMonth += hoursToday;
      }

      // Calculate attendance status counts for current month
      const presentDays = monthlyLogs.filter(
        (log) => log.status === "Present"
      ).length;
      const halfDays = monthlyLogs.filter(
        (log) => log.status === "Half-Day"
      ).length;
      const absentDays = monthlyLogs.filter(
        (log) => log.status === "Absent"
      ).length;

      // Calculate total expected workdays in the month so far
      const workdaysInMonthSoFar = this.getWeekdaysCount(startOfMonth, today);

      // Calculate attendance percentage
      const attendancePercentage =
        workdaysInMonthSoFar > 0
          ? Math.round(
              ((presentDays + halfDays * 0.5) / workdaysInMonthSoFar) * 100
            )
          : 0;

      // Format the time for display
      const formatTime = (hours: number): string => {
        const totalMinutes = Math.round(hours * 60);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        if (hrs === 0) {
          return `${mins} minutes`;
        } else if (mins === 0) {
          return `${hrs} ${hrs === 1 ? "hour" : "hours"}`;
        } else {
          return `${hrs} ${hrs === 1 ? "hour" : "hours"} ${mins} minutes`;
        }
      };

      return res.status(200).json({
        success: true,
        message: "Attendance analytics retrieved successfully",
        data: {
          current: {
            hoursToday: Number(hoursToday.toFixed(2)),
            hoursDisplay: formatTime(hoursToday),
            currentStatus,
            isPunchedIn,
          },
          summary: {
            hoursThisWeek: Number(hoursThisWeek.toFixed(2)),
            hoursThisWeekDisplay: formatTime(hoursThisWeek),
            hoursThisMonth: Number(hoursThisMonth.toFixed(2)),
            hoursThisMonthDisplay: formatTime(hoursThisMonth),
            attendancePercentage,
            presentDays,
            halfDays,
            absentDays,
          },
          standardHours: {
            daily: 8,
            weekly: 40,
            monthly: workdaysInMonthSoFar * 8,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving attendance analytics:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving attendance analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getWeeklyAttendance(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;

      // Fix the week start date calculation
      let startDate: Date;

      if (req.query.startDate) {
        // Convert to UTC date to avoid timezone issues
        const providedDateStr = req.query.startDate as string;
        const [year, month, day] = providedDateStr
          .split("-")
          .map((n) => parseInt(n));

        // Create date using UTC methods to avoid timezone shifts
        // Note: Month is 0-indexed in JavaScript
        startDate = new Date(Date.UTC(year, month - 1, day));

        // Get day of week (0 = Sunday, 6 = Saturday in UTC)
        const dayOfWeek = startDate.getUTCDay();

        // Adjust to previous Sunday
        if (dayOfWeek !== 0) {
          startDate.setUTCDate(startDate.getUTCDate() - dayOfWeek);
        }

        console.log("Provided date (UTC):", startDate.toISOString());
      } else {
        // Get current date in UTC
        const today = new Date();
        const todayUTC = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
          )
        );

        // Get day of week (0 = Sunday, 6 = Saturday in UTC)
        const dayOfWeek = todayUTC.getUTCDay();

        // Calculate start of week (Sunday) in UTC
        startDate = new Date(todayUTC);
        startDate.setUTCDate(todayUTC.getUTCDate() - dayOfWeek);
      }

      // Set time to beginning of day in UTC
      startDate.setUTCHours(0, 0, 0, 0);

      // End date is 7 days later (next Sunday) in UTC
      const endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 6);
      endDate.setUTCHours(23, 59, 59, 999);

      console.log("Week start date (UTC):", startDate.toISOString());
      console.log("Week end date (UTC):", endDate.toISOString());

      // Get all logs for the week
      const logs = await AttendanceLog.find({
        employee_id: employeeId,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ date: 1 });

      // Create a map of logs by date string for quicker access
      const logByDate = new Map();
      logs.forEach((log) => {
        // Convert to YYYY-MM-DD format in UTC
        const dateObj = new Date(log.date);
        const dateString = dateObj.toISOString().split("T")[0];
        logByDate.set(dateString, log);
      });

      // Day names in correct order
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      // Format data specifically for visualization
      const dailyData = [];
      let weeklyTotal = 0;

      for (let i = 0; i < 7; i++) {
        // Create a new date object for each day of the week
        const currentDate = new Date(startDate);
        currentDate.setUTCDate(startDate.getUTCDate() + i);

        // Format as YYYY-MM-DD for consistency
        const dateString = currentDate.toISOString().split("T")[0];

        // Get day of week (0-6)
        const dayOfWeek = currentDate.getUTCDay();
        const dayName = dayNames[dayOfWeek];

        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const log = logByDate.get(dateString);

        console.log(
          `Day ${i}: ${dateString} is a ${dayName} (day ${dayOfWeek})`
        );

        let hours = 0;
        let status = "N/A";

        if (log) {
          hours = log.totalHours || 0;
          status = log.status;
        }

        dailyData.push({
          date: dateString,
          day: dayName,
          hours: Number(hours.toFixed(2)),
          status: status,
          isWeekday,
        });

        weeklyTotal += hours;
      }

      // Calculate weekly compliance
      const weekdayCount = dailyData.filter((day) => day.isWeekday).length;
      const expectedHours = weekdayCount * 8;
      const compliancePercentage =
        expectedHours > 0
          ? Math.min(100, Math.round((weeklyTotal / expectedHours) * 100))
          : 100;

      const formatTime = (hours: number): string => {
        const totalMinutes = Math.round(hours * 60);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        if (hrs === 0) {
          return `${mins} minutes`;
        } else if (mins === 0) {
          return `${hrs} ${hrs === 1 ? "hour" : "hours"}`;
        } else {
          return `${hrs} ${hrs === 1 ? "hour" : "hours"} ${mins} minutes`;
        }
      };

      const formattedDailyData = dailyData.map((day) => ({
        ...day,
        hoursDisplay: formatTime(day.hours),
      }));

      return res.status(200).json({
        success: true,
        message: "Weekly attendance data retrieved successfully",
        data: {
          weekRange: {
            start: startDate.toISOString().split("T")[0],
            end: endDate.toISOString().split("T")[0],
          },
          summary: {
            totalHours: Number(weeklyTotal.toFixed(2)),
            totalHoursDisplay: formatTime(weeklyTotal),
            expectedHours,
            expectedHoursDisplay: formatTime(expectedHours),
            compliancePercentage,
          },
          dailyData: formattedDailyData,
        },
      });
    } catch (error) {
      console.error("Error retrieving weekly attendance:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving weekly attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Helper method to count weekdays between two dates
   */
  private getWeekdaysCount(startDate: Date, endDate: Date): number {
    let count = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Count Monday (1) through Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  /**
   * Add a comment to a ticket assigned to the employee
   */
  async addTicketComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { ticketId, comment } = req.body;

      // Validate required fields
      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required",
        });
      }

      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message: "Comment text is required",
        });
      }

      // Find the ticket and verify employee has access (is assigned to it)
      const ticket = await Ticket.findOne({
        _id: new Types.ObjectId(ticketId),
        assignedTo: new Types.ObjectId(employeeId),
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or you're not assigned to this ticket",
        });
      }

      // Get employee details to include with comment
      const employee = await Employee.findById(employeeId).select(
        "firstName lastName"
      );

      if (!employee) {
        return res.status(500).json({
          success: false,
          message: "Employee details not found",
        });
      }

      // Add comment to ticket
      ticket.comments = ticket.comments || [];
      const newComment = {
        text: comment,
        createdBy: new Types.ObjectId(employeeId),
        createdAt: new Date(),
      };

      ticket.comments.push(newComment);
      await ticket.save();

      const addedComment = ticket.comments[ticket.comments.length - 1];

      return res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: {
          commentId: addedComment._id,
          text: comment,
          createdAt: newComment.createdAt,
          authorName: `${employee.firstName} ${employee.lastName}`,
          commentCount: ticket.comments.length,
        },
      });
    } catch (error) {
      console.error("Error adding ticket comment:", error);
      return res.status(500).json({
        success: false,
        message: "Error adding comment to ticket",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get ticket details with all comments for the assigned employee
   */
  async getTicketDetails(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { ticketId } = req.body; // Changed from req.params to req.body for consistency with admin implementation

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required",
        });
      }

      // Find ticket assigned to this employee
      const ticket = await Ticket.findOne({
        _id: new Types.ObjectId(ticketId),
        assignedTo: new Types.ObjectId(employeeId),
      }).populate("client_id", "companyName contactPerson");

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not assigned to you",
        });
      }

      // Get all comment author details
      const commentUserIds =
        ticket.comments?.map((comment) => comment.createdBy.toString()) || [];

      if (commentUserIds.length === 0) {
        // No comments case - early return
        return res.status(200).json({
          success: true,
          message: "Ticket details retrieved successfully",
          data: {
            id: ticket._id,
            ticketCode: ticket.ticketCode,
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            status: ticket.status,
            createdAt: ticket.createdAt,
            client: ticket.client_id,
            comments: [],
            commentCount: 0,
          },
        });
      }

      const Employee = require("../models/employee").default;
      const Admin = require("../models/admin").default;
      const { Client } = require("../models/client");

      interface IAuthor {
        _id: Types.ObjectId;
        [key: string]: any; // Additional fields
      }

      const [employeeAuthors, clientAuthors, adminAuthors] = await Promise.all([
        Employee.find({
          _id: { $in: commentUserIds.map((id) => new Types.ObjectId(id)) },
        })
          .select("_id firstName lastName")
          .lean() as Promise<IAuthor[]>,

        Client.find({
          _id: { $in: commentUserIds.map((id) => new Types.ObjectId(id)) },
        })
          .select("_id companyName contactPerson")
          .lean() as Promise<IAuthor[]>,

        Admin.find({
          _id: { $in: commentUserIds.map((id) => new Types.ObjectId(id)) },
        })
          .select("_id")
          .lean() as Promise<IAuthor[]>,
      ]);

      // Create maps for quick lookup with proper typing
      const employeeMap = new Map<string, string>();
      employeeAuthors.forEach((emp: IAuthor) => {
        employeeMap.set(emp._id.toString(), `${emp.firstName} ${emp.lastName}`);
      });

      const clientMap = new Map<string, string>();
      clientAuthors.forEach((client: IAuthor) => {
        clientMap.set(
          client._id.toString(),
          client.contactPerson || client.companyName
        );
      });

      const adminMap = new Map<string, string>();
      adminAuthors.forEach((admin: IAuthor) => {
        adminMap.set(admin._id.toString(), "Admin");
      });

      // Format comments with author names with proper typing
      const formattedComments = (ticket.comments || []).map((comment) => {
        const userId = comment.createdBy.toString();
        let authorName = "Unknown User";

        if (employeeMap.has(userId)) {
          authorName = employeeMap.get(userId) || authorName;
        } else if (clientMap.has(userId)) {
          authorName = clientMap.get(userId) || authorName;
        } else if (adminMap.has(userId)) {
          authorName = "Admin";
        }

        return {
          id: comment._id,
          text: comment.text,
          createdAt: comment.createdAt,
          authorName: authorName,
        };
      });

      // Sort comments by newest first
      formattedComments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.status(200).json({
        success: true,
        message: "Ticket details retrieved successfully",
        data: {
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt,
          client: ticket.client_id,
          comments: formattedComments,
          commentCount: formattedComments.length,
        },
      });
    } catch (error) {
      console.error("Error retrieving ticket details:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving ticket details",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update status of a ticket assigned to the employee
   * Employees can only update the status of tickets assigned to them
   */
  async updateTicketStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { ticketId, status, comment } = req.body;

      // Validate required fields
      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
        });
      }

      // Validate status value - employees can only set specific statuses
      const allowedStatuses = ["In Progress", "Resolved"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Employees can only set status to: ${allowedStatuses.join(
            ", "
          )}`,
        });
      }

      // Find ticket assigned to this employee
      const ticket = await Ticket.findOne({
        _id: new Types.ObjectId(ticketId),
        assignedTo: new Types.ObjectId(employeeId),
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not assigned to you",
        });
      }

      // Update status
      ticket.status = status;

      // Add comment if provided
      if (comment && comment.trim()) {
        ticket.comments = ticket.comments || [];
        const newComment = {
          text: `Status updated to "${status}"${comment ? `: ${comment}` : ""}`,
          createdBy: new Types.ObjectId(employeeId),
          createdAt: new Date(),
        };
        ticket.comments.push(newComment);
      }

      // Save the updated ticket
      await ticket.save();

      // Get employee details for response
      const employee = await Employee.findById(employeeId)
        .select("firstName lastName employee_id")
        .lean();

      return res.status(200).json({
        success: true,
        message: `Ticket status updated to '${status}' successfully`,
        data: {
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          title: ticket.title,
          status: ticket.status,
          updatedBy: employee
            ? {
                id: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                employee_id: employee.employee_id,
              }
            : "Unknown Employee",
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating ticket status:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating ticket status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all tickets assigned to the current employee
   * With optional filtering by status and priority
   */
  async getAssignedTickets(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const {
        status,
        priority,
        sort = "createdAt",
        order = "desc",
      } = req.query;

      // Build query
      const query: any = { assignedTo: new Types.ObjectId(employeeId) };

      // Filter by status if provided
      if (status) {
        if (
          !["Pending", "In Progress", "Resolved", "Closed"].includes(
            status as string
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid status value",
          });
        }
        query.status = status;
      }

      // Filter by priority if provided
      if (priority) {
        if (!["Low", "Medium", "High"].includes(priority as string)) {
          return res.status(400).json({
            success: false,
            message: "Invalid priority value",
          });
        }
        query.priority = priority;
      }

      // Determine sort order
      const sortOptions: any = {};
      sortOptions[sort as string] = order === "asc" ? 1 : -1;

      // Define an interface for the populated client field
      interface PopulatedClient {
        _id: Types.ObjectId;
        companyName?: string;
        contactPerson?: string;
        email?: string;
        phone?: string;
      }

      // Find tickets and ensure type safety with populated fields
      const tickets = await Ticket.find(query)
        .sort(sortOptions)
        .populate<{ client_id: PopulatedClient }>(
          "client_id",
          "companyName contactPerson email phone"
        )
        .lean();

      // Prepare summary statistics
      const summary = {
        total: tickets.length,
        pending: tickets.filter((ticket) => ticket.status === "Pending").length,
        inProgress: tickets.filter((ticket) => ticket.status === "In Progress")
          .length,
        resolved: tickets.filter((ticket) => ticket.status === "Resolved")
          .length,
        closed: tickets.filter((ticket) => ticket.status === "Closed").length,
        highPriority: tickets.filter((ticket) => ticket.priority === "High")
          .length,
        clientResolved: tickets.filter((ticket) => ticket.clientResolved)
          .length,
      };

      // Format tickets with simplified client information that's relevant for employees
      const formattedTickets = tickets.map((ticket) => ({
        id: ticket._id,
        ticketCode: ticket.ticketCode,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        clientResolved: ticket.clientResolved || false,
        clientResolvedAt: ticket.clientResolvedAt,
        createdAt: ticket.createdAt,
        client: {
          id: ticket.client_id._id,
          name:
            ticket.client_id.companyName ||
            ticket.client_id.contactPerson ||
            "Unknown Client",
          email: ticket.client_id.email || "",
          phone: ticket.client_id.phone || "",
        },
        commentCount: ticket.comments?.length || 0,
      }));

      return res.status(200).json({
        success: true,
        message: "Assigned tickets retrieved successfully",
        summary,
        tickets: formattedTickets,
      });
    } catch (error) {
      console.error("Error retrieving assigned tickets:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving tickets",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get ticket timeline for employee
   * Shows key events in chronological order
   * Only accessible for tickets assigned to the employee
   */
  async getTicketTimeline(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const employeeId = req.user.id;
      const { ticketId } = req.body;

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required",
        });
      }

      // Define interfaces for the populated fields
      interface PopulatedClient {
        _id: Types.ObjectId;
        companyName?: string;
        contactPerson?: string;
      }

      // Find ticket assigned to this employee
      const ticket = await Ticket.findOne({
        _id: new Types.ObjectId(ticketId),
        assignedTo: new Types.ObjectId(employeeId),
      })
        .populate<{ client_id: PopulatedClient }>(
          "client_id",
          "companyName contactPerson"
        )
        .select(
          "ticketCode title status priority createdAt clientResolved clientResolvedAt comments"
        )
        .lean();

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not assigned to you",
        });
      }

      // Define types for the timeline events
      interface TimelineBaseData {
        ticketCode: string;
        title: string;
        priority: "Low" | "Medium" | "High";
        client: string | { name: string };
      }

      interface TimelineAssignmentData {
        assignee: string;
      }

      interface TimelineResolutionData {
        resolvedByClient: boolean;
      }

      interface TimelineStatusData {
        status: string;
      }

      interface TimelineCommentData {
        totalComments: number;
        latestComment: {
          text: string;
          date: Date;
          author: string;
        } | null;
      }

      // Use a discriminated union type for timeline events
      type TimelineEvent =
        | {
            type: "creation";
            title: string;
            date: Date;
            data: TimelineBaseData;
          }
        | {
            type: "assignment";
            title: string;
            date: Date;
            data: TimelineAssignmentData;
          }
        | {
            type: "client_resolution";
            title: string;
            date: Date;
            data: TimelineResolutionData;
          }
        | {
            type: "resolution";
            title: string;
            date: Date;
            data: TimelineStatusData;
          }
        | {
            type: "comments";
            title: string;
            date: Date;
            data: TimelineCommentData;
          };

      // Initialize timeline array with proper typing
      const timeline: TimelineEvent[] = [];

      // 1. Generate base timeline data
      timeline.push({
        type: "creation",
        title: "Ticket Created",
        date: ticket.createdAt,
        data: {
          ticketCode: ticket.ticketCode,
          title: ticket.title,
          priority: ticket.priority,
          client: ticket.client_id
            ? {
                name:
                  ticket.client_id.companyName ||
                  ticket.client_id.contactPerson ||
                  "Unknown",
              }
            : "Unknown Client",
        },
      });

      // 2. Add assignment event
      timeline.push({
        type: "assignment",
        title: "Ticket Assigned to You",
        date: ticket.createdAt, // Using creation date as assignment date
        data: {
          assignee: "You",
        },
      });

      // 3. Add client resolution event if it exists
      if (ticket.clientResolved && ticket.clientResolvedAt) {
        timeline.push({
          type: "client_resolution",
          title: "Marked as Resolved by Client",
          date: ticket.clientResolvedAt,
          data: {
            resolvedByClient: true,
          },
        });
      }

      // 4. Add status resolution event if applicable
      if (ticket.status === "Resolved" || ticket.status === "Closed") {
        // Find the most recent status update comment
        const statusUpdateComment = ticket.comments?.find(
          (comment) =>
            comment.text.includes('Status updated to "Resolved"') ||
            comment.text.includes('Status updated to "Closed"')
        );

        timeline.push({
          type: "resolution",
          title: `Ticket ${ticket.status}`,
          date: statusUpdateComment?.createdAt || new Date(),
          data: {
            status: ticket.status,
          },
        });
      }

      // 5. Get comments info
      const totalComments = ticket.comments?.length || 0;
      const latestComment =
        ticket.comments && ticket.comments.length > 0
          ? [...ticket.comments].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )[0]
          : null;

      // Get author info for latest comment if exists
      let latestCommentAuthor: string | null = null;
      if (latestComment) {
        const authorId = latestComment.createdBy.toString();

        // Check if the author is the current employee
        if (authorId === employeeId.toString()) {
          latestCommentAuthor = "You";
        } else {
          // Find author from appropriate collection
          const [admin, employee, client] = await Promise.all([
            Admin.findById(authorId).select("_id").lean(),
            Employee.findById(authorId).select("firstName lastName").lean(),
            Client.findById(authorId)
              .select("companyName contactPerson")
              .lean(),
          ]);

          if (admin) latestCommentAuthor = "Admin";
          else if (
            employee &&
            "firstName" in employee &&
            "lastName" in employee
          ) {
            latestCommentAuthor = `${employee.firstName} ${employee.lastName}`;
          } else if (
            client &&
            ("companyName" in client || "contactPerson" in client)
          ) {
            latestCommentAuthor =
              client.contactPerson || client.companyName || "Client";
          }
        }
      }

      // Add comment activity summary to timeline
      if (totalComments > 0) {
        timeline.push({
          type: "comments",
          title: "Comment Activity",
          date: latestComment?.createdAt || ticket.createdAt,
          data: {
            totalComments,
            latestComment: latestComment
              ? {
                  text:
                    latestComment.text?.substring(0, 50) +
                    (latestComment.text?.length > 50 ? "..." : ""),
                  date: latestComment.createdAt,
                  author: latestCommentAuthor || "Unknown",
                }
              : null,
          },
        });
      }

      // 6. Sort timeline events by date
      timeline.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Prepare response
      return res.status(200).json({
        success: true,
        message: "Ticket timeline retrieved successfully",
        data: {
          ticketId: ticket._id,
          ticketCode: ticket.ticketCode,
          title: ticket.title,
          status: ticket.status,
          currentPriority: ticket.priority,
          clientResolved: ticket.clientResolved || false,
          timeline,
        },
      });
    } catch (error) {
      console.error("Error retrieving ticket timeline:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving ticket timeline",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get team members (same department OR same projects) whose birthday is today.
   * If no birthdays today, returns the next upcoming birthdays from team members.
   * Displays their role and whether the current user has wished them.
   */
  async getTodaysTeamBirthdays(
    req: AuthRequest,
    res: Response
  ): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }
      const currentEmployeeId = new Types.ObjectId(req.user.id);

      const currentUser = await Employee.findById(currentEmployeeId).select(
        "department_id"
      );
      if (!currentUser) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found." });
      }

      // 1. Get today's date info for comparing birthdays
      const today = new Date();
      const currentMonth = today.getUTCMonth() + 1; // Use UTC method (1-12)
      const currentDay = today.getUTCDate(); // Use UTC method

      // Create date range for today (start/end of day in UTC) for accurate wish comparison
      const startOfToday = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
      );
      const endOfToday = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );

      // 2. Get project IDs current user is part of
      const currentUserProjects = await Project.find({
        $or: [
          { teamMembers: currentEmployeeId },
          { teamLeaders: currentEmployeeId },
          { managers: currentEmployeeId },
        ],
      }).select("_id");
      const currentUserProjectIds = Array.from(
        currentUserProjects.map((p) => p._id.toString())
      );

      // Store the current user's department ID as string for easy comparison
      const currentUserDepartmentId = currentUser.department_id
        ? currentUser.department_id.toString()
        : null;

      // 3. Find all other employees with DOB, populate their role
      const potentialColleagues = await Employee.find({
        _id: { $ne: currentEmployeeId }, // Exclude the current user
        dob: { $exists: true, $ne: null }, // Ensure dob exists
      })
        .populate<{ role_id: { _id: Types.ObjectId; name: string } | null }>(
          "role_id",
          "name"
        )
        .select("firstName lastName dob department_id role_id");

      // 4. Process all colleagues to find birthdays today and track team members for next birthday logic
      const birthdayTeamMembersMap = new Map<
        string,
        TeamBirthdayEmployeeViewModel
      >();
      const allTeamMembers: {
        id: string;
        firstName: string;
        lastName: string;
        roleName: string;
        dob: Date;
        nextBirthdayDate: Date;
        daysUntil: number;
      }[] = [];

      // First, process each colleague to determine if they're a team member
      for (const colleague of potentialColleagues) {
        if (!colleague.dob) continue;

        // Check if the colleague is a team member (same department or project)
        let isTeamMember = false;

        // Check 1: Same department - convert both to strings for reliable comparison
        if (currentUserDepartmentId && colleague.department_id) {
          const colleagueDeptId = colleague.department_id.toString();
          if (colleagueDeptId === currentUserDepartmentId) {
            isTeamMember = true;
          }
        }

        // Check 2: Shared project (if not already confirmed as team member)
        if (!isTeamMember && currentUserProjectIds.length > 0) {
          const colleagueId = colleague._id;

          const colleagueIsInSharedProject = await Project.exists({
            _id: {
              $in: currentUserProjectIds.map((id) => new Types.ObjectId(id)),
            },
            $or: [
              { teamMembers: colleagueId },
              { teamLeaders: colleagueId },
              { managers: colleagueId },
            ],
          });

          if (colleagueIsInSharedProject) {
            isTeamMember = true;
          }
        }

        // If not a team member, skip to next colleague
        if (!isTeamMember) continue;

        // Convert DOB to UTC date components for consistent comparison
        const dobMonth = colleague.dob.getUTCMonth() + 1;
        const dobDay = colleague.dob.getUTCDate();
        const colleagueIdStr = colleague._id.toString();
        const roleName = colleague.role_id ? colleague.role_id.name : "N/A";

        // Check if it's their birthday today (using UTC date components)
        if (dobMonth === currentMonth && dobDay === currentDay) {
          // Check if a birthday wish has been sent (using proper date range comparison)
          const wishSent = await BirthdayWish.findOne({
            wisherEmployeeId: currentEmployeeId,
            birthdayEmployeeId: colleague._id,
            wishDate: { $gte: startOfToday, $lte: endOfToday },
          });

          // Add to today's birthdays map
          birthdayTeamMembersMap.set(colleagueIdStr, {
            employeeId: colleagueIdStr,
            firstName: colleague.firstName,
            lastName: colleague.lastName,
            roleName: roleName,
            hasWishedToday: !!wishSent,
          });
        } else {
          // Calculate the next birthday date
          const thisYear = today.getUTCFullYear();
          const nextBirthdayThisYear = new Date(
            Date.UTC(thisYear, dobMonth - 1, dobDay)
          );

          // If birthday this year has passed, calculate for next year
          const nextBirthdayDate =
            nextBirthdayThisYear < today
              ? new Date(Date.UTC(thisYear + 1, dobMonth - 1, dobDay))
              : nextBirthdayThisYear;

          // Calculate days until next birthday
          const daysUntil = Math.ceil(
            (nextBirthdayDate.getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          allTeamMembers.push({
            id: colleagueIdStr,
            firstName: colleague.firstName,
            lastName: colleague.lastName,
            roleName: roleName,
            dob: colleague.dob,
            nextBirthdayDate: nextBirthdayDate,
            daysUntil: daysUntil,
          });
        }
      }

      // 5. Process results based on whether we found birthdays today
      const todaysBirthdays = Array.from(birthdayTeamMembersMap.values());

      // If we found birthdays today, return them without next birthday calculation
      if (todaysBirthdays.length > 0) {
        return res.status(200).json({
          success: true,
          message: "Team birthdays found today!",
          hasTodaysBirthdays: true,
          data: todaysBirthdays,
        });
      }
      // No birthdays today - find all upcoming birthdays with same closest date
      else {
        // Sort team members by days until birthday to find the minimum days
        allTeamMembers.sort((a, b) => a.daysUntil - b.daysUntil);

        // If we have any team members with future birthdays
        if (allTeamMembers.length > 0) {
          // Get the minimum days until next birthday
          const minDaysUntil = allTeamMembers[0].daysUntil;

          // Find all team members who share the same next closest birthday
          const nextBirthdays = allTeamMembers.filter(
            (member) => member.daysUntil === minDaysUntil
          );

          // Convert to array of objects for response
          const nextBirthdayData = nextBirthdays.map((member) => ({
            employeeId: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            roleName: member.roleName,
            birthdayDate: member.nextBirthdayDate,
            daysUntil: member.daysUntil,
          }));

          return res.status(200).json({
            success: true,
            message:
              "No team birthdays today. Returning next upcoming birthdays.",
            hasTodaysBirthdays: false,
            nextBirthdays: nextBirthdayData,
          });
        } else {
          return res.status(200).json({
            success: true,
            message: "No team birthdays found for today or upcoming.",
            hasTodaysBirthdays: false,
            data: [],
          });
        }
      }
    } catch (error) {
      console.error("Error retrieving team birthdays:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving team birthdays",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Record that the current employee has sent a birthday wish to a colleague.
   */
  async sendBirthdayWish(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }
      const wisherEmployeeId = new Types.ObjectId(req.user.id);
      const { colleagueEmployeeId } = req.body; // The ID of the employee whose birthday it is

      if (
        !colleagueEmployeeId ||
        !Types.ObjectId.isValid(colleagueEmployeeId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid colleagueEmployeeId is required.",
        });
      }

      const colleagueIdAsObject = new Types.ObjectId(colleagueEmployeeId);

      // Optional: Verify it's actually their birthday.
      // This is a good server-side check even if the frontend filters.
      const colleague = await Employee.findById(colleagueIdAsObject).select(
        "dob"
      );
      if (!colleague || !colleague.dob) {
        return res.status(404).json({
          success: false,
          message: "Colleague or their date of birth not found.",
        });
      }
      const today = new Date();
      if (
        colleague.dob.getUTCMonth() !== today.getUTCMonth() ||
        colleague.dob.getUTCDate() !== today.getUTCDate()
      ) {
        return res.status(400).json({
          success: false,
          message: "It's not this colleague's birthday today.",
        });
      }
      // --- End Optional Verification ---

      const todayDateOnly = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
      );

      // Attempt to create a new wish. The unique index on BirthdayWish model will prevent duplicates.
      const newWish = new BirthdayWish({
        wisherEmployeeId,
        birthdayEmployeeId: colleagueIdAsObject,
        wishDate: todayDateOnly,
      });
      await newWish.save();

      // You might want to trigger a notification here if you have a system for it.

      return res.status(201).json({
        success: true,
        message: "Birthday wish sent successfully!",
      });
    } catch (error: any) {
      console.error("Error sending birthday wish:", error);
      if (error.code === 11000) {
        // Handle duplicate key error from unique index
        return res
          .status(409)
          .json({ success: true, message: "Wish already sent today." });
      }
      return res.status(500).json({
        success: false,
        message: "Error sending birthday wish",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getCommonLeavePolicy(req: Request, res: Response): Promise<Response> {
    try {
      const authReq = req as AuthRequest;

      if (!authReq.user || !authReq.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing",
        });
      }

      const currentYear = new Date().getFullYear();
      const today = dayjs().startOf("day");

      // 1. Fetch the general company policy (latest version)
      const companyPolicyDocument = await Policy.findOne()
        .sort({ updatedAt: -1 })
        .select("title content dated updatedAt")
        .lean();

      // 2. Fetch the current default leave rules applicable to all employees
      let defaultLeaveRules: ILeaveForEmp | null = await LeaveForEmp.findOne({
        isDefault: true,
        year: currentYear,
      })
        .select("name description days year isDefault") // Added isDefault for clarity
        .lean<ILeaveForEmp>();

      if (!defaultLeaveRules) {
        defaultLeaveRules = await LeaveForEmp.findOne({ isDefault: true })
          .sort({ year: -1 })
          .select("name description days year isDefault") // Added isDefault for clarity
          .lean<ILeaveForEmp>();
      }

      // 3. Fetch company holidays for the current year, sorted chronologically
      const companyHolidays = await LeaveForEmp.find({
        isHoliday: true,
        year: currentYear,
      })
        .select("name holidayDate description year isHoliday") // Added isHoliday for clarity
        .sort({ holidayDate: 1 })
        .lean<ILeaveForEmp[]>();

      // 4. Fetch employee-specific leave policy
      let employeeSpecificPolicy: ILeaveForEmp | null = null;
      const employee = await Employee.findById(authReq.user.id).select(
        "leaveRef"
      );

      if (employee && employee.leaveRef) {
        const specificPolicyDoc = await LeaveForEmp.findById(employee.leaveRef)
          .select("name description days year isSpecific") // Select relevant fields
          .lean<ILeaveForEmp>();

        // Only consider it if it's explicitly marked as specific
        if (specificPolicyDoc && specificPolicyDoc.isSpecific) {
          employeeSpecificPolicy = specificPolicyDoc;
        }
      }

      // 5. Determine the next upcoming holiday
      let nextUpcomingHolidayData: {
        name: string;
        date: Date;
        description?: string;
        daysUntil: number;
      } | null = null;

      const upcomingHolidaysFromToday = companyHolidays.filter(
        (h) => h.holidayDate && dayjs(h.holidayDate).isSameOrAfter(today)
      );

      if (upcomingHolidaysFromToday.length > 0) {
        const nextHolidayDoc = upcomingHolidaysFromToday[0];
        if (nextHolidayDoc.holidayDate) {
          const daysUntil = dayjs(nextHolidayDoc.holidayDate).diff(
            today,
            "day"
          );
          nextUpcomingHolidayData = {
            name: nextHolidayDoc.name,
            date: nextHolidayDoc.holidayDate,
            description: nextHolidayDoc.description,
            daysUntil: daysUntil,
          };
        }
      }

      return res.status(200).json({
        success: true,
        message:
          "Common and specific leave policy details retrieved successfully.",
        data: {
          generalPolicy: companyPolicyDocument
            ? {
                title: companyPolicyDocument.title,
                content: companyPolicyDocument.content,
                effectiveDate: companyPolicyDocument.dated,
                lastUpdated: companyPolicyDocument.updatedAt,
              }
            : null,
          defaultLeaveRules: defaultLeaveRules
            ? {
                name: defaultLeaveRules.name,
                description: defaultLeaveRules.description,
                daysAllowed: defaultLeaveRules.days,
                applicableYear: defaultLeaveRules.year,
              }
            : null,
          employeeSpecificPolicy: employeeSpecificPolicy
            ? {
                // New field for specific policy
                name: employeeSpecificPolicy.name,
                description: employeeSpecificPolicy.description,
                daysAllowed: employeeSpecificPolicy.days,
                applicableYear: employeeSpecificPolicy.year,
              }
            : null,
          nextUpcomingHoliday: nextUpcomingHolidayData,
          companyHolidays: companyHolidays.map((h) => ({
            name: h.name,
            date: h.holidayDate,
            description: h.description,
          })),
        },
      });
    } catch (error) {
      console.error(
        "Error retrieving common and specific leave policy details:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Error retrieving common and specific leave policy details",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  //

  //
  async getTasksByProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      const tasks = await Task.find({ project_id: projectId })
        .populate("project_id", "projectName")
        .populate("assigned_employees", "firstName lastName") // ⭐ Only essential fields
        .sort({ createdAt: -1 });

      const cleaned = tasks.map((t) => ({
        _id: t._id,
        project: t.project_id,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        assigned_employees: t.assigned_employees.map((emp: any) => ({
          _id: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
        })),
      }));

      return res.status(200).json({
        message: "Tasks retrieved successfully",
        count: cleaned.length,
        data: cleaned,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  //

  async editTaskStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { taskId } = req.params;
      const { status } = req.body;

      // Allowed statuses
      const allowedStatuses = [
        "Pending",
        "In Progress",
        "Completed",
        "On Hold",
      ];

      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status value",
          allowed: allowedStatuses,
        });
      }

      const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        { status },
        { new: true }
      )
        .populate("project_id", "projectName")
        .populate("assigned_employees", "fullName email");

      if (!updatedTask) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      return res.status(200).json({
        message: "Task status updated successfully",
        data: updatedTask,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error updating task status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  //

  // get Project Documentation by project Id

  async getProjectDocumentation(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { project_id } = req.params;

      // ✅ Validate project_id
      if (!project_id || !Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required",
        });
      }

      // ✅ Find documentation for project
      const documentation = await ProjectDocumentation.findOne({ project_id });
      if (!documentation) {
        return res.status(404).json({
          success: false,
          message: "Project documentation not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Project documentation retrieved successfully",
        data: documentation,
      });
    } catch (error) {
      console.error("Error in getProjectDocumentation:", error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving project documentation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  //

  // projectDocumentaion creation

  async addProjectDocumentation(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { project_id, data } = req.body;

      // ✅ Validate required fields
      if (!project_id || !data) {
        return res.status(400).json({
          success: false,
          message: "Project ID and documentation data are required",
        });
      }

      // ✅ Validate project_id
      if (!Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      // ✅ Ensure project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // ✅ Create documentation entry
      const documentation = new ProjectDocumentation({
        project_id: new Types.ObjectId(project_id),
        data,
        lastUpdate: new Date(), // auto-set to now
      });

      const savedDoc = await documentation.save();

      return res.status(201).json({
        success: true,
        message: "Project documentation added successfully",
        data: savedDoc,
      });
    } catch (error) {
      console.error("Error in addProjectDocumentation:", error);
      return res.status(500).json({
        success: false,
        message: "Error adding project documentation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // projectDocumentaion edit
  async editProjectDocumentation(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { project_id } = req.params;
      const { data } = req.body;

      // ✅ Validate project_id
      if (!project_id || !Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required",
        });
      }

      // ✅ Validate data
      if (!data || typeof data !== "string") {
        return res.status(400).json({
          success: false,
          message: "Documentation data must be a non-empty string",
        });
      }

      // ✅ Find documentation for project
      const documentation = await ProjectDocumentation.findOne({ project_id });
      if (!documentation) {
        return res.status(404).json({
          success: false,
          message: "Project documentation not found",
        });
      }

      // ✅ Replace existing data with new data
      documentation.data = data;

      // ✅ Update lastUpdate timestamp
      documentation.lastUpdate = new Date();

      // ✅ Save changes
      const updatedDoc = await documentation.save();

      return res.status(200).json({
        success: true,
        message: "Project documentation updated successfully",
        data: updatedDoc,
      });
    } catch (error) {
      console.error("Error in editProjectDocumentation:", error);
      return res.status(500).json({
        success: false,
        message: "Error editing project documentation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

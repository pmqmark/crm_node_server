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
import { IProject, Project } from "../models/projects";
import mongoose, { isValidObjectId, Types } from "mongoose";
import AttendanceLog from "../models/logs";
import Leave, { LeaveType } from "../models/leave";
import Ticket from '../models/ticket';
import Invoice from '../models/invoice';
import { CreateInvoiceDto, UpdateInvoiceDto, GetInvoiceDto, DeleteInvoiceDto, detailCreateInvoiceDto } from '../dtos/invoicedto';
import { AuthRequest } from '../middleware/verifyToken';
import Task from "../models/tasks";
import Schedule from "../models/schedules";
import { Review } from "../models/review";
import Skill from '../models/skill';

interface CreateScheduleDto {
  employee_ids: string[];
  description: string;
  meet_link: string;
  scheduled_time: Date;
  title: string;
}

interface ITeamMember {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  role_id?: {
    _id: Types.ObjectId;
    name: string;
  };
}

interface UpdateProjectDto {
  project_id: string;
  projectName?: string;
  client?: string;
  startDate?: Date;
  endDate?: Date;
  priority?: 'Low' | 'Medium' | 'High';
  projectValue?: number;
  projectDescription?: string;
  teamMembers?: string[];
  teamLeaders?: string[];
  managers?: string[];
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  tags?: ('Urgent' | 'Internal' | 'Client-Facing' | 'Research' | 'Maintenance')[];
}

interface ScheduleFilters {
  fromDate?: Date;
  toDate?: Date;
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
  employee_id?: string;
}

interface ITeamLeader {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

type StatusType = 'Full-Time' | 'Contract' | 'Probation' | 'WFH';
interface StatusCounts {
  total: number;
  'Full-Time': number;
  'Contract': number;
  'Probation': number;
  'WFH': number;
}


interface ITaskEmployee {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

interface ITask {
  _id: Types.ObjectId;
  description: string;
  assigned_employees: ITaskEmployee[];
  completed_at?: Date;
  created_at: Date;
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

interface TaskStats {
  total: number;
  statusCounts: {
    Pending: number;
    'In Progress': number;
    Completed: number;
    'On Hold': number;
  };
  statusPercentages: {
    Pending: number;
    'In Progress': number;
    Completed: number;
    'On Hold': number;
  };
}

interface IPunchedEmployee {
  _id: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  department_id?: Types.ObjectId;
  punchIn: Date;
  punchOut: Date | null;
  status: 'Present' | 'Absent' | 'Half-Day';
  totalHours: number;
}

interface IPunchSummary {
  totalPunchedIn: number;
  currentlyWorking: number;
  completedShift: number;
}

export class AdminController {

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

  async createAdmin(req: Request, res: Response): Promise<Response> {
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



  async updateProject(req: Request, res: Response): Promise<Response> {
    try {
      const updateData: UpdateProjectDto = req.body;

      // Validate project_id
      if (!updateData.project_id || !Types.ObjectId.isValid(updateData.project_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required"
        });
      }

      // Find project
      const existingProject = await Project.findById(updateData.project_id);
      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Build update object
      const updateObj: Partial<IProject> = {};

      // Update basic fields if provided
      if (updateData.projectName) updateObj.projectName = updateData.projectName;
      if (updateData.projectDescription) updateObj.projectDescription = updateData.projectDescription;
      if (updateData.projectValue) updateObj.projectValue = updateData.projectValue;
      if (updateData.priority) updateObj.priority = updateData.priority;
      if (updateData.status) updateObj.status = updateData.status;

      // Update dates if provided
      if (updateData.startDate) updateObj.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateObj.endDate = new Date(updateData.endDate);


      // Update client if provided
      if (updateData.client && Types.ObjectId.isValid(updateData.client)) {
        const clientExists = await Client.findById(updateData.client);
        if (!clientExists) {
          return res.status(400).json({
            success: false,
            message: "Invalid client ID"
          });
        }
        updateObj.client = new mongoose.Schema.Types.ObjectId(updateData.client);
      }

      // Update team members if provided
      if (updateData.teamMembers) {
        const validMembers = updateData.teamMembers.filter(id => mongoose.Types.ObjectId.isValid(id));
        const members = await Employee.find({ _id: { $in: validMembers } });
        if (members.length !== validMembers.length) {
          return res.status(400).json({
            success: false,
            message: "One or more invalid team member IDs"
          });
        }
        updateObj.teamMembers = validMembers.map(id => new mongoose.Schema.Types.ObjectId(id));
      }

      // Update team leaders if provided
      if (updateData.teamLeaders) {
        const validLeaders = updateData.teamLeaders.filter(id => mongoose.Types.ObjectId.isValid(id));
        const leaders = await Employee.find({ _id: { $in: validLeaders } });
        if (leaders.length !== validLeaders.length) {
          return res.status(400).json({
            success: false,
            message: "One or more invalid team leader IDs"
          });
        }
        updateObj.teamLeaders = validLeaders.map(id => new mongoose.Schema.Types.ObjectId(id));
      }

      // Update managers if provided
      if (updateData.managers) {
        const validManagers = updateData.managers.filter(id => mongoose.Types.ObjectId.isValid(id));
        const managers = await Employee.find({ _id: { $in: validManagers } });
        if (managers.length !== validManagers.length) {
          return res.status(400).json({
            success: false,
            message: "One or more invalid manager IDs"
          });
        }
        updateObj.managers = validManagers.map(id => new mongoose.Schema.Types.ObjectId(id));
      }

      // Update tags if provided
      if (updateData.tags) {
        updateObj.tags = updateData.tags;
      }

      // Update project
      const updatedProject = await Project.findByIdAndUpdate(
        updateData.project_id,
        { $set: updateObj },
        { new: true }
      ).populate([
        { path: 'client', select: 'companyName' },
        { path: 'teamMembers', select: 'firstName lastName' },
        { path: 'teamLeaders', select: 'firstName lastName' },
        { path: 'managers', select: 'firstName lastName' }
      ]);

      return res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: updatedProject
      });

    } catch (error) {
      console.error('Error updating project:', error);
      return res.status(500).json({
        success: false,
        message: "Error updating project",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }





  async createSchedule(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Admin ID is missing"
        });
      }

      const scheduleData: CreateScheduleDto = req.body;

      // Create schedule
      const schedule = new Schedule({
        employee_ids: scheduleData.employee_ids,
        description: scheduleData.description,
        meet_link: scheduleData.meet_link,
        scheduled_time: new Date(scheduleData.scheduled_time),
        title: scheduleData.title,
        created_by: req.user.id,
        status: 'Scheduled'
      });

      const savedSchedule = await schedule.save();

      if (!savedSchedule) {
        return res.status(500).json({
          success: false,
          message: "Error saving schedule"
        });
      }

      return res.status(201).json({
        success: true,
        message: "Schedule created successfully",
        data: {
          _id: savedSchedule._id,
          employee_ids: savedSchedule.employee_ids,
          description: savedSchedule.description,
          meet_link: savedSchedule.meet_link,
          scheduled_time: savedSchedule.scheduled_time.toISOString(),
          title: savedSchedule.title,
          status: savedSchedule.status,
          created_by: savedSchedule.created_by,
          created_at: savedSchedule.created_at?.toISOString(),
          updated_at: savedSchedule.updated_at?.toISOString()
        }
      });

    } catch (error) {
      console.error('Error creating schedule:', error);
      return res.status(500).json({
        success: false,
        message: "Error creating schedule",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async listSchedules(req: Request, res: Response): Promise<Response> {
    try {
      const schedules = await Schedule.find();

      return res.status(200).json({
        message: "clients retrieved successfully",
        data: schedules
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving employees",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getProjectDetails(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id } = req.body;

      // Validate project_id
      if (!project_id || !Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required"
        });
      }

      // Get project details
      const project = await Project.findById(project_id)
        .select('projectName status teamLeaders teamMembers managers');

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Get team leaders details
      console.log(project.teamLeaders)
      const teamLeaders = await Employee.find({
        _id: { $in: project.teamLeaders }
      }).select('firstName lastName');

      console.log(teamLeaders)

      // Get team members details
      const teamMembers = await Employee.find({
        _id: { $in: project.teamMembers }
      }).select('firstName lastName role_id');

      // Get team members' roles
      const roleIds = teamMembers.map(member => member.role_id).filter(id => id);
      const roles = await Role.find({
        _id: { $in: roleIds }
      }).select('_id name');

      // Create roles map
      const rolesMap = new Map(roles.map(role => [role._id.toString(), role.name]));

      // Get managers details
      const managers = await Employee.find({
        _id: { $in: project.managers }
      }).select('firstName lastName');

      return res.status(200).json({
        success: true,
        message: "Project details retrieved successfully",
        data: {
          projectId: project._id,
          projectName: project.projectName,
          status: project.status,
          teamLeaders: teamLeaders.map(leader => ({
            id: leader._id.toString(),
            name: `${leader.firstName} ${leader.lastName}`
          })),
          teamMembers: teamMembers.map(member => ({
            id: member._id.toString(),
            name: `${member.firstName} ${member.lastName}`,
            role: member.role_id ? rolesMap.get(member.role_id.toString()) || 'No Role Assigned' : 'No Role Assigned'
          })),
          managers: managers.map(manager => ({
            id: manager._id.toString(),
            name: `${manager.firstName} ${manager.lastName}`
          }))
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving project details",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async addTeamMember(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id, employee_id } = req.body;

      // Validate IDs
      if (!project_id || !Types.ObjectId.isValid(project_id) ||
        !employee_id || !Types.ObjectId.isValid(employee_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID and employee ID are required"
        });
      }

      // Check if project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found"
        });
      }

      // Check if employee exists
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Employee not found"
        });
      }

      // Add team member using $addToSet to prevent duplicates
      const updatedProject = await Project.findByIdAndUpdate(
        project_id,
        {
          $addToSet: {
            teamMembers: new Types.ObjectId(employee_id)
          }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Team member added successfully",
        data: {
          project_id: updatedProject?._id,
          teamMembers: updatedProject?.teamMembers
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error adding team member",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async addTeamLeader(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id, employee_id } = req.body;

      // Validate IDs
      if (!project_id || !Types.ObjectId.isValid(project_id) ||
        !employee_id || !Types.ObjectId.isValid(employee_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID and employee ID are required"
        });
      }

      // Check if project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found"
        });
      }

      // Check if employee exists
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Employee not found"
        });
      }

      // Add team leader using $addToSet to prevent duplicates
      const updatedProject = await Project.findByIdAndUpdate(
        project_id,
        {
          $addToSet: {
            teamLeaders: new Types.ObjectId(employee_id)
          }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Team leader added successfully",
        data: {
          project_id: updatedProject?._id,
          teamLeaders: updatedProject?.teamLeaders
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error adding team leader",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async addProjectManager(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id, employee_id } = req.body;

      // Validate IDs
      if (!project_id || !Types.ObjectId.isValid(project_id) ||
        !employee_id || !Types.ObjectId.isValid(employee_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID and employee ID are required"
        });
      }

      // Check if project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found"
        });
      }

      // Check if employee exists
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Employee not found"
        });
      }

      // Add manager using $addToSet to prevent duplicates
      const updatedProject = await Project.findByIdAndUpdate(
        project_id,
        {
          $addToSet: {
            managers: new Types.ObjectId(employee_id)
          }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Project manager added successfully",
        data: {
          project_id: updatedProject?._id,
          managers: updatedProject?.managers
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error adding project manager",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async assignTask(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id, assigned_employees, description, status = 'Pending' } = req.body;

      // Validate required fields
      if (!project_id || !Array.isArray(assigned_employees) || !description) {
        return res.status(400).json({
          success: false,
          message: "Project ID, assigned employees array, and description are required"
        });
      }

      // Validate project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Validate all employee IDs are valid ObjectIds
      const validObjectIds = assigned_employees.every(id => Types.ObjectId.isValid(id));
      if (!validObjectIds) {
        return res.status(400).json({
          success: false,
          message: "One or more employee IDs are not valid ObjectIds"
        });
      }

      // Convert string IDs to ObjectIds for querying
      const objectIds = assigned_employees.map(id => new Types.ObjectId(id));

      // Validate employees exist using _id
      const validEmployees = await Employee.find({
        _id: { $in: objectIds }
      }).select('_id firstName lastName');

      // Debug logging
      console.log("Found employees count:", validEmployees.length);
      console.log("Expected employees count:", assigned_employees.length);

      if (validEmployees.length !== assigned_employees.length) {
        const foundIds = validEmployees.map(emp => emp._id.toString());

        // Log for debugging
        console.log("Found IDs:", foundIds);
        console.log("Assigned employee IDs:", assigned_employees);

        const invalidIds = assigned_employees.filter(id =>
          !foundIds.some(foundId => foundId === id.toString())
        );

        return res.status(400).json({
          success: false,
          message: "Some employee IDs are invalid",
          invalidEmployees: invalidIds
        });
      }

      // Create new task with ObjectIds
      const task = new Task({
        project_id: new Types.ObjectId(project_id),
        assigned_employees: objectIds,
        description,
        status,
      });

      const savedTask = await task.save();

      return res.status(201).json({
        success: true,
        message: "Task assigned successfully",
        data: {
          ...savedTask.toObject(),
          assignedEmployeeDetails: validEmployees.map(emp => ({
            _id: emp._id,
            name: `${emp.firstName} ${emp.lastName}`
          }))
        }
      });

    } catch (error) {
      console.error("Error in assignTask:", error);
      return res.status(500).json({
        success: false,
        message: "Error assigning task",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async getLatestCompletedTasks(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id } = req.body;

      if (!project_id || !Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required"
        });
      }

      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      const completedTasks = await Task.find({
        project_id: new Types.ObjectId(project_id),
        status: 'Completed'
      })
        .populate<{ assigned_employees: ITaskEmployee[] }>('assigned_employees', 'firstName lastName')
        .select('description assigned_employees completed_at created_at')
        .sort({ completed_at: -1 })
        .limit(8);

      const formattedTasks = completedTasks.map(task => ({
        _id: task._id,
        description: task.description,
        assigned_employees: task.assigned_employees.map(emp => ({
          id: emp._id,
          name: `${emp.firstName} ${emp.lastName}`
        })),

      }));

      return res.status(200).json({
        success: true,
        message: "Latest completed tasks retrieved successfully",
        data: {
          projectName: project.projectName,
          tasks: formattedTasks
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving completed tasks",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }



  async getClientCount(req: Request, res: Response): Promise<Response> {
    try {
      const totalClients = await Client.countDocuments();

      return res.status(200).json({
        success: true,
        message: "Client count retrieved successfully",
        data: {
          totalClients
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving client count",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getProjectCount(req: Request, res: Response): Promise<Response> {
    try {
      const totalProjects = await Project.countDocuments();

      return res.status(200).json({
        success: true,
        message: "Client count retrieved successfully",
        data: {
          totalProjects
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving client count",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  async getTodaysPunchedEmployees(req: Request, res: Response): Promise<Response> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const punchedEmployees = await AttendanceLog.aggregate<IPunchedEmployee>([
        {
          $match: {
            date: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },
        {
          $lookup: {
            from: 'users', // Since Employee is a discriminator of User
            localField: 'employee_id',
            foreignField: '_id',
            as: 'employeeDetails'
          }
        },
        {
          $unwind: '$employeeDetails'
        },
        {
          $match: {
            'employeeDetails.__t': 'Employee' // Filter for Employee discriminator
          }
        },
        {
          $project: {
            employeeId: '$employeeDetails.employee_id',
            firstName: '$employeeDetails.firstName',
            lastName: '$employeeDetails.lastName',
            department_id: '$employeeDetails.department_id',
            punchIn: 1,
            punchOut: 1,
            status: 1,
            totalHours: 1
          }
        },
        {
          $sort: { punchIn: -1 }
        }
      ]);

      const summary: IPunchSummary = {
        totalPunchedIn: punchedEmployees.length,
        currentlyWorking: punchedEmployees.filter(emp => !emp.punchOut).length,
        completedShift: punchedEmployees.filter(emp => emp.punchOut).length
      };

      return res.status(200).json({
        message: "Today's punched employees retrieved successfully",
        date: today.toISOString().split('T')[0],
        summary,
        data: punchedEmployees.map(emp => ({
          ...emp,
          punchIn: emp.punchIn.toLocaleTimeString(),
          punchOut: emp.punchOut ? emp.punchOut.toLocaleTimeString() : null
        }))
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving punched employees",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  //   async getDatabaseLogs(req: Request, res: Response): Promise<Response> {
  //     try {
  //         const { startDate, endDate, collection } = req.query;

  //         const query: any = {};
  //         let logs: any[] = [];

  //         // Add date range if provided
  //         if (startDate || endDate) {
  //             query.createdAt = {};
  //             if (startDate) {
  //                 query.createdAt.$gte = new Date(startDate.toString());
  //             }
  //             if (endDate) {
  //                 query.createdAt.$lte = new Date(endDate.toString());
  //             }
  //         }

  //         const collections: { [key: string]: any } = {
  //             'AttendanceLog': AttendanceLog,
  //             'Leave': Leave,
  //             'Employee': Employee,
  //             'Project': Project,
  //             'Ticket': Ticket
  //         };

  //         const collectionName = collection?.toString();

  //         if (collectionName && collectionName in collections) {
  //             // If specific collection requested
  //             logs = await collections[collectionName]
  //                 .find(query)
  //                 .sort({ createdAt: -1 })
  //                 .limit(100);
  //         } else {
  //             // Get from all collections
  //             const results = await Promise.all(
  //                 Object.values(collections).map(model => 
  //                     model.find(query).sort({ createdAt: -1 }).limit(100)
  //                 )
  //             );
  //             logs = results.flat();
  //         }

  //         // Format logs
  //         const formattedLogs = logs.map(log => ({
  //             collection: log.constructor.modelName,
  //             documentId: log._id,
  //             createdAt: log.createdAt,
  //             updatedAt: log.updatedAt,
  //             data: log.toObject()
  //         }));

  //         // Sort by date
  //         formattedLogs.sort((a, b) => 
  //             b.createdAt.getTime() - a.createdAt.getTime()
  //         );

  //         // Calculate stats
  //         const stats = {
  //             totalDocuments: formattedLogs.length,
  //             collections: formattedLogs.reduce((acc, log) => {
  //                 acc[log.collection] = (acc[log.collection] || 0) + 1;
  //                 return acc;
  //             }, {} as Record<string, number>)
  //         };

  //         return res.status(200).json({
  //             message: "Database logs retrieved successfully",
  //             stats,
  //             data: formattedLogs
  //         });

  //     } catch (error) {
  //         return res.status(500).json({
  //             message: "Error retrieving database logs",
  //             error: error instanceof Error ? error.message : "Unknown error"
  //         });
  //     }
  // }


  async createInvoice1(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Admin ID is missing"
        });
      }

      const adminId = req.user.id;
      const invoiceData: detailCreateInvoiceDto = req.body;

      // Validate required fields
      if (!invoiceData.client_id || !invoiceData.items || !invoiceData.dueDate) {
        return res.status(400).json({
          success: false,
          message: "Client ID, items array, and due date are required"
        });
      }

      // Validate client exists
      if (!Types.ObjectId.isValid(invoiceData.client_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID format"
        });
      }

      const client = await Client.findById(invoiceData.client_id);
      if (!client) {
        return res.status(400).json({
          success: false,
          message: "Client not found"
        });
      }

      // Validate project if provided
      if (invoiceData.project_id) {
        if (!Types.ObjectId.isValid(invoiceData.project_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid project ID format"
          });
        }

        const project = await Project.findById(invoiceData.project_id);
        if (!project) {
          return res.status(400).json({
            success: false,
            message: "Project not found"
          });
        }
      }

      // Validate items array
      if (!Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one item is required"
        });
      }

      // Validate each item
      for (const item of invoiceData.items) {
        if (!item.service_name || !item.service_type) {
          return res.status(400).json({
            success: false,
            message: "Each item must have service_name and service_type"
          });
        }

        if (item.service_type === 'hourly' && (!item.hours || !item.rate_per_hour)) {
          return res.status(400).json({
            success: false,
            message: "Hourly services require hours and rate_per_hour"
          });
        }

        if ((item.service_type === 'fixed' || item.service_type === 'subscription') && !item.fixed_price) {
          return res.status(400).json({
            success: false,
            message: "Fixed and subscription services require fixed_price"
          });
        }
      }

      // Create invoice
      const invoice = new Invoice({
        client_id: new Types.ObjectId(invoiceData.client_id),
        project_id: invoiceData.project_id ? new Types.ObjectId(invoiceData.project_id) : undefined,
        items: invoiceData.items,
        tax_rate: invoiceData.tax_rate,
        description: invoiceData.description,
        terms: invoiceData.terms,
        invoiceDate: invoiceData.invoiceDate || new Date(),
        dueDate: new Date(invoiceData.dueDate),
        status: 'Pending',
        createdBy: new Types.ObjectId(adminId),
        isVisible: true
      });

      const savedInvoice = await invoice.save();

      // Populate references for response
      await savedInvoice.populate([
        { path: 'client_id', select: 'companyName contactPerson email' },
        { path: 'project_id', select: 'projectName' }
      ]);

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: savedInvoice
      });

    } catch (error) {
      console.error('Error creating invoice:', error);
      return res.status(500).json({
        success: false,
        message: "Error creating invoice",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async updateInvoice1(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Admin ID is missing"
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Validate invoice ID
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID format"
        });
      }

      // Find existing invoice
      const existingInvoice = await Invoice.findById(id);
      if (!existingInvoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      // Handle soft delete if isVisible is provided
      if (typeof updateData.isVisible === 'boolean') {
        updateData.updatedAt = new Date();
      }

      // Validate items if included in update
      if (updateData.items) {
        if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
          return res.status(400).json({
            success: false,
            message: "At least one item is required"
          });
        }

        // Validate each item
        for (const item of updateData.items) {
          if (!item.service_name || !item.service_type) {
            return res.status(400).json({
              success: false,
              message: "Each item must have service_name and service_type"
            });
          }

          if (item.service_type === 'hourly' && (!item.hours || !item.rate_per_hour)) {
            return res.status(400).json({
              success: false,
              message: "Hourly services require hours and rate_per_hour"
            });
          }

          if ((item.service_type === 'fixed' || item.service_type === 'subscription') && !item.fixed_price) {
            return res.status(400).json({
              success: false,
              message: "Fixed and subscription services require fixed_price"
            });
          }
        }
      }

      // Handle status update
      if (updateData.status === 'Paid' && !updateData.paymentDate) {
        updateData.paymentDate = new Date();
      }

      // Update invoice
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        id,
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).populate([
        { path: 'client_id', select: 'companyName contactPerson email' },
        { path: 'project_id', select: 'projectName' }
      ]);

      if (!updatedInvoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invoice updated successfully",
        data: updatedInvoice
      });

    } catch (error) {
      console.error('Error updating invoice:', error);
      return res.status(500).json({
        success: false,
        message: "Error updating invoice",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getProjectTasks(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id } = req.body;

      // Validate project_id
      if (!project_id || !Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required"
        });
      }

      // Check if project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Get all tasks for the project
      const tasks = await Task.find({
        project_id: new Types.ObjectId(project_id)
      })
        .select('description status assigned_employees created_at')
        .sort({ created_at: -1 });

      // Calculate task statistics
      const taskStats = {
        total: tasks.length,
        status: {
          Pending: tasks.filter(task => task.status === 'Pending').length,
          'In Progress': tasks.filter(task => task.status === 'In Progress').length,
          Completed: tasks.filter(task => task.status === 'Completed').length,
          'On Hold': tasks.filter(task => task.status === 'On Hold').length
        }
      };

      return res.status(200).json({
        success: true,
        message: "Project tasks retrieved successfully",
        data: {
          projectName: project.projectName,
          statistics: taskStats,
          tasks: tasks
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving project tasks",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }



  async getProjectTaskStatistics(req: Request, res: Response): Promise<Response> {
    try {
      const { project_id } = req.body;

      // Validate project_id
      if (!project_id || !Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid project ID is required"
        });
      }

      // Check if project exists
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Get task counts by status for specific project using aggregation
      const taskStats = await Task.aggregate([
        {
          $match: {
            project_id: new Types.ObjectId(project_id)
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Initialize stats object
      const stats: TaskStats = {
        total: 0,
        statusCounts: {
          'Pending': 0,
          'In Progress': 0,
          'Completed': 0,
          'On Hold': 0
        },
        statusPercentages: {
          'Pending': 0,
          'In Progress': 0,
          'Completed': 0,
          'On Hold': 0
        }
      };

      // Calculate total and fill in counts
      taskStats.forEach(stat => {
        if (stat._id in stats.statusCounts) {
          stats.statusCounts[stat._id as keyof typeof stats.statusCounts] = stat.count;
          stats.total += stat.count;
        }
      });

      // Calculate percentages
      if (stats.total > 0) {
        Object.keys(stats.statusCounts).forEach(status => {
          const count = stats.statusCounts[status as keyof typeof stats.statusCounts];
          stats.statusPercentages[status as keyof typeof stats.statusPercentages] =
            Number(((count / stats.total) * 100).toFixed(2));
        });
      }

      return res.status(200).json({
        success: true,
        message: "Project task statistics retrieved successfully",
        data: {
          projectName: project.projectName,
          total: stats.total,
          byStatus: {
            counts: stats.statusCounts,
            percentages: stats.statusPercentages
          }
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving project task statistics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getTaskStatistics(req: Request, res: Response): Promise<Response> {
    try {
      // Get task counts by status using aggregation
      const taskStats = await Task.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Initialize stats object
      const stats: TaskStats = {
        total: 0,
        statusCounts: {
          'Pending': 0,
          'In Progress': 0,
          'Completed': 0,
          'On Hold': 0
        },
        statusPercentages: {
          'Pending': 0,
          'In Progress': 0,
          'Completed': 0,
          'On Hold': 0
        }
      };

      // Calculate total and fill in counts
      taskStats.forEach(stat => {
        if (stat._id in stats.statusCounts) {
          stats.statusCounts[stat._id as keyof typeof stats.statusCounts] = stat.count;
          stats.total += stat.count;
        }
      });

      // Calculate percentages
      if (stats.total > 0) {
        Object.keys(stats.statusCounts).forEach(status => {
          const count = stats.statusCounts[status as keyof typeof stats.statusCounts];
          stats.statusPercentages[status as keyof typeof stats.statusPercentages] =
            Number(((count / stats.total) * 100).toFixed(2));
        });
      }

      return res.status(200).json({
        message: "Task statistics retrieved successfully",
        data: {
          total: stats.total,
          byStatus: {
            counts: stats.statusCounts,
            percentages: stats.statusPercentages
          }
        }
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving task statistics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getAttendanceLogs(req: Request, res: Response): Promise<Response> {
    try {
      const {
        employee_id,
        startDate,
        endDate,
        status
      } = req.query;

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

      const attendanceLogs = await AttendanceLog.find(query)
        .sort({ date: -1, punchIn: -1 });

      // Get employee details separately if needed
      const employeeIds = [...new Set(attendanceLogs.map(log => log.employee_id))];
      const employees = await Employee.find({ employee_id: { $in: employeeIds } })
        .select('employee_id firstName lastName');

      // Create employee lookup map
      const employeeMap = new Map(
        employees.map(emp => [emp.employee_id, emp])
      );

      // Combine attendance logs with employee details
      const enrichedLogs = attendanceLogs.map(log => ({
        ...log.toObject(),
        employeeDetails: employeeMap.get(log.employee_id.toString()) || null
      }));

      // Calculate summary statistics
      const summary = {
        totalRecords: enrichedLogs.length,
        present: enrichedLogs.filter(log => log.status === 'Present').length,
        absent: enrichedLogs.filter(log => log.status === 'Absent').length,
        halfDay: enrichedLogs.filter(log => log.status === 'Half-Day').length,
        averageHours: enrichedLogs.reduce((acc, log) => acc + (log.totalHours || 0), 0) / enrichedLogs.length || 0
      };

      return res.status(200).json({
        message: "Attendance logs retrieved successfully",
        summary,
        data: enrichedLogs
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving attendance logs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async updateLeaveStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { leaveId, status, comments } = req.body;

      // Validate required fields
      if (!leaveId || !status) {
        return res.status(400).json({
          message: "Leave ID and status are required"
        });
      }

      // Validate status
      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({
          message: "Status must be either 'Approved' or 'Rejected'"
        });
      }

      // Find the leave request
      const leaveRequest = await Leave.findById(leaveId);
      if (!leaveRequest) {
        return res.status(404).json({
          message: "Leave request not found"
        });
      }

      // Check if leave is already processed
      if (leaveRequest.status !== 'Pending') {
        return res.status(400).json({
          message: `Leave request has already been ${leaveRequest.status.toLowerCase()}`
        });
      }

      // Update leave status
      const updatedLeave = await Leave.findByIdAndUpdate(
        leaveId,
        {
          $set: {
            status,
            ...(comments && { comments })
          }
        },
        { new: true }
      );

      // Get employee details for response
      const employee = await Employee.findOne({
        employee_id: leaveRequest.employee_id
      }).select('firstName lastName employee_id');

      return res.status(200).json({
        message: `Leave request ${status.toLowerCase()} successfully`,
        data: {
          ...updatedLeave?.toObject(),
          employeeDetails: employee
        }
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error updating leave status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async createClient(req: Request, res: Response): Promise<Response> {
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
        description: clientData.description,
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


  async createRoles(req: Request, res: Response): Promise<Response> {
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

      // No need to generate employee_id, it's handled by middleware
      const hashedPassword = await bcrypt.hash(employeeData.password, 10);

      const employee = new Employee({
        // employee_id is not needed here, it will be auto-generated
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
        status: employeeData.status || 'Probation',
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
  }



  async getDailyAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyStats = await this.getAttendanceStats(today, new Date());

      return res.status(200).json({
        message: "Daily attendance retrieved successfully",
        date: today.toISOString().split('T')[0],
        data: dailyStats
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving daily attendance",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async getWeeklyAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyStats = await this.getAttendanceStats(startOfWeek, new Date());

      return res.status(200).json({
        message: "Weekly attendance retrieved successfully",
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        data: weeklyStats
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving weekly attendance",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }



  async getMonthlyAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const monthlyStats = await this.getAttendanceStats(startOfMonth, new Date());

      return res.status(200).json({
        message: "Monthly attendance retrieved successfully",
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        data: monthlyStats
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving monthly attendance",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  private async getAttendanceStats(startDate: Date, endDate: Date): Promise<AttendanceStats> {
    try {
      // Get total number of employees
      const totalEmployees = await Employee.countDocuments();

      // Get attendance records for the period
      const attendanceCounts = await AttendanceLog.aggregate([
        {
          $match: {
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const stats = {
        present: 0,
        absent: 0,
        halfDay: 0,
        presentPercentage: 0,
        absentPercentage: 0,
        halfDayPercentage: 0,
        totalEmployees
      };


      attendanceCounts.forEach(item => {
        switch (item._id) {
          case 'Present':
            stats.present = item.count;
            break;
          case 'Half-Day':
            stats.halfDay = item.count;
            break;
        }
      });

      // Calculate absent as total employees minus (present + half-day)
      stats.absent = totalEmployees - (stats.present + stats.halfDay);

      // Ensure absent count doesn't go below 0
      stats.absent = Math.max(0, stats.absent);

      // Calculate percentages
      stats.presentPercentage = (stats.present / totalEmployees) * 100;
      stats.halfDayPercentage = (stats.halfDay / totalEmployees) * 100;
      stats.absentPercentage = (stats.absent / totalEmployees) * 100;

      return stats;

    } catch (error) {
      console.error('Error calculating attendance stats:', error);
      throw error;
    }
  }









  async getEmployeeStatusCount(req: Request, res: Response): Promise<Response> {
    try {
      const counts = await Employee.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const total = counts.reduce((sum, item) => sum + item.count, 0);

      // Initialize status counts with proper typing
      const statusCounts: StatusCounts = {
        total,
        'Full-Time': 0,
        'Contract': 0,
        'Probation': 0,
        'WFH': 0
      };

      // Fill in actual counts with type checking
      counts.forEach(item => {
        const status = item._id as StatusType;
        if (status in statusCounts) {
          statusCounts[status] = item.count;
        }
      });

      return res.status(200).json({
        message: "Employee status counts retrieved successfully",
        data: statusCounts
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving employee counts",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }





  async createDepartment(req: Request, res: Response) {
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
      const clients = await Client.find().lean();

      const settledResults = await Promise.allSettled(clients?.map(async (client, index) => {
        const query: any = { client: new Types.ObjectId(client._id) };
        const projects = await Project.find(query).lean()
        const altProjects = projects?.map(p => ({
          name: p?.projectName,
          progress: p?.status === 'Completed' ? 100
            : p?.status === 'In Progress' ? 50
              : 0
        }));

        return { ...client, projects: altProjects };
      })
      )

      const result = settledResults
        .filter(r => r.status === 'fulfilled')
        .map((r: any) => r.value)

      return res.status(200).json({
        message: "clients retrieved successfully",
        data: result
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


  async getAllLeaves(req: Request, res: Response): Promise<Response> {
    try {
      const {
        employee_id,
        status,
        fromDate,
        toDate,
        leaveType
      } = req.query;

      const query: any = {};

      // Filter by employee_id if provided
      if (employee_id) {
        query.employee_id = employee_id;
      }

      // Filter by status if provided
      if (status) {
        if (!['Pending', 'Approved', 'Rejected'].includes(status as string)) {
          return res.status(400).json({
            message: "Invalid status. Must be Pending, Approved, or Rejected"
          });
        }
        query.status = status;
      }

      // Filter by leaveType if provided
      if (leaveType) {
        if (!Object.values(LeaveType).includes(leaveType as LeaveType)) {
          return res.status(400).json({
            message: "Invalid leave type"
          });
        }
        query.leaveType = leaveType;
      }

      // Filter by date range if provided
      if (fromDate || toDate) {
        query.$or = [
          {
            fromDate: {
              ...(fromDate && { $gte: new Date(fromDate as string) }),
              ...(toDate && { $lte: new Date(toDate as string) })
            }
          },
          {
            toDate: {
              ...(fromDate && { $gte: new Date(fromDate as string) }),
              ...(toDate && { $lte: new Date(toDate as string) })
            }
          }
        ];
      }

      const leaves = await Leave.find(query)
        .sort({ createdAt: -1 });

      // Get unique employee IDs
      const employeeIds = [...new Set(leaves.map(leave => leave.employee_id))];

      // Get employee details
      const employees = await Employee.find({
        employee_id: { $in: employeeIds }
      }).select('employee_id firstName lastName');

      // Create employee lookup map
      const employeeMap = new Map(
        employees.map(emp => [emp.employee_id.toString(), emp])
      );

      // Combine leave data with employee details
      const enrichedLeaves = leaves.map(leave => ({
        ...leave.toObject(),
        employeeDetails: employeeMap.get(leave.employee_id.toString()) || null
      }));

      // Calculate summary
      const summary = {
        totalRequests: enrichedLeaves.length,
        pending: enrichedLeaves.filter(leave => leave.status === 'Pending').length,
        approved: enrichedLeaves.filter(leave => leave.status === 'Approved').length,
        rejected: enrichedLeaves.filter(leave => leave.status === 'Rejected').length,
        byType: {
          medical: enrichedLeaves.filter(leave => leave.leaveType === LeaveType.MEDICAL).length,
          casual: enrichedLeaves.filter(leave => leave.leaveType === LeaveType.CASUAL).length,
          vacation: enrichedLeaves.filter(leave => leave.leaveType === LeaveType.VACATION).length
        }
      };

      return res.status(200).json({
        message: "Leave requests retrieved successfully",
        summary,
        data: enrichedLeaves
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error retrieving leave requests",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getTickets(req: Request, res: Response): Promise<Response> {
    try {
      const { status, priority, clientId, ticketCode } = req.query;

      // Build query
      const query: any = {};

      // Filter by status if provided
      if (status) {
        if (!['Pending', 'In Progress', 'Resolved', 'Closed'].includes(status as string)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status value"
          });
        }
        query.status = status;
      }

      // Filter by priority if provided
      if (priority) {
        if (!['Low', 'Medium', 'High'].includes(priority as string)) {
          return res.status(400).json({
            success: false,
            message: "Invalid priority value"
          });
        }
        query.priority = priority;
      }

      // Filter by client if provided
      if (clientId && Types.ObjectId.isValid(clientId as string)) {
        query.client_id = new Types.ObjectId(clientId as string);
      }

      // Filter by ticketCode if provided
      if (ticketCode) {
        query.ticketCode = ticketCode;
      }

      const tickets = await Ticket.find(query)
        .sort({ createdAt: -1 })
        .populate('client_id', 'companyName contactPerson email')
        .populate('assignedTo', 'firstName lastName employee_id')
        .lean();

      // Calculate statistics
      const summary = {
        total: tickets.length,
        pending: tickets.filter(ticket => ticket.status === 'Pending').length,
        inProgress: tickets.filter(ticket => ticket.status === 'In Progress').length,
        resolved: tickets.filter(ticket => ticket.status === 'Resolved').length,
        closed: tickets.filter(ticket => ticket.status === 'Closed').length,
        highPriority: tickets.filter(ticket => ticket.priority === 'High').length
      };

      return res.status(200).json({
        success: true,
        message: "Tickets retrieved successfully",
        summary,
        tickets
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving tickets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async updateTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id, ticketCode, status, priority, assignedTo, comments } = req.body;

      // Validate we have either id or ticketCode
      if (!id && !ticketCode) {
        return res.status(400).json({
          success: false,
          message: "Either ticket ID or ticketCode is required"
        });
      }

      // Find ticket
      let ticket;
      if (id && Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      } else if (ticketCode) {
        ticket = await Ticket.findOne({ ticketCode });
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found"
        });
      }

      // Build update object
      const updateData: any = {};

      // Update status if provided
      if (status) {
        if (!['Pending', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status value"
          });
        }
        updateData.status = status;
      }

      // Update priority if provided
      if (priority) {
        if (!['Low', 'Medium', 'High'].includes(priority)) {
          return res.status(400).json({
            success: false,
            message: "Invalid priority value"
          });
        }
        updateData.priority = priority;
      }

      // Update assignedTo if provided
      if (assignedTo) {
        if (!Types.ObjectId.isValid(assignedTo)) {
          return res.status(400).json({
            success: false,
            message: "Invalid employee ID for assignment"
          });
        }

        // Verify the employee exists
        const employee = await Employee.findById(assignedTo);
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: "Employee not found for assignment"
          });
        }

        updateData.assignedTo = assignedTo;
      }

      // Add comment if provided
      if (comments) {
        // We need a valid admin id from the request user
        ticket.comments = ticket.comments || [];
        ticket.comments.push({
          text: comments,
          createdBy: new Types.ObjectId(req.body.adminId), // Assuming the admin ID is sent in the request
          createdAt: new Date()
        });
      }

      // Apply updates to the ticket
      Object.assign(ticket, updateData);

      // Save the ticket
      const updatedTicket = await ticket.save();

      // Get populated data for response
      const populatedTicket = await Ticket.findById(updatedTicket._id)
        .populate('client_id', 'companyName contactPerson email')
        .populate('assignedTo', 'firstName lastName employee_id')
        .lean();

      return res.status(200).json({
        success: true,
        message: "Ticket updated successfully",
        ticket: populatedTicket
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error updating ticket",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async deleteTicket(req: Request, res: Response): Promise<Response> {
    try {
      const { id, ticketCode } = req.body;

      // Validate we have either id or ticketCode
      if (!id && !ticketCode) {
        return res.status(400).json({
          success: false,
          message: "Either ticket ID or ticketCode is required"
        });
      }

      // Find ticket
      let ticket;
      if (id && Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id);
      } else if (ticketCode) {
        ticket = await Ticket.findOne({ ticketCode });
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found"
        });
      }

      // Delete the ticket
      await Ticket.findByIdAndDelete(ticket._id);

      return res.status(200).json({
        success: true,
        message: `Ticket ${ticketCode || id} deleted successfully`
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error deleting ticket",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Add a comment to a ticket as an admin
   */
  async addTicketComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Admin ID is missing"
        });
      }

      const adminId = req.user.id;
      const { ticketId, ticketCode, comment } = req.body;

      // Validate either ticketId or ticketCode is provided
      if ((!ticketId || !Types.ObjectId.isValid(ticketId)) && !ticketCode) {
        return res.status(400).json({
          success: false,
          message: "Either valid ticket ID or ticket code is required"
        });
      }

      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message: "Comment text is required"
        });
      }

      // Find the ticket by ID or code
      let ticket;
      if (ticketId && Types.ObjectId.isValid(ticketId)) {
        ticket = await Ticket.findById(ticketId);
      } else if (ticketCode) {
        ticket = await Ticket.findOne({ ticketCode });
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found"
        });
      }

      // Add comment
      ticket.comments = ticket.comments || [];
      const newComment = {
        text: comment,
        createdBy: new Types.ObjectId(adminId),
        createdAt: new Date()
      };

      ticket.comments.push(newComment);
      await ticket.save();

      // Get the newly added comment
      const addedComment = ticket.comments[ticket.comments.length - 1];

      return res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: {
          ticketId: ticket._id,
          ticketCode: ticket.ticketCode,
          commentId: addedComment._id,
          text: comment,
          createdAt: newComment.createdAt,
          authorName: "Admin",
          commentCount: ticket.comments.length
        }
      });

    } catch (error) {
      console.error('Error adding ticket comment:', error);
      return res.status(500).json({
        success: false,
        message: "Error adding comment to ticket",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async getTicketDetails(req: Request, res: Response): Promise<Response> {
    try {
      const { id, ticketCode } = req.body;

      // Find ticket
      let ticket;
      if (id && Types.ObjectId.isValid(id)) {
        ticket = await Ticket.findById(id)
          .populate('client_id', 'companyName contactPerson email')
          .populate('assignedTo', 'firstName lastName employee_id')
          .lean();
      } else if (ticketCode) {
        ticket = await Ticket.findOne({ ticketCode })
          .populate('client_id', 'companyName contactPerson email')
          .populate('assignedTo', 'firstName lastName employee_id')
          .lean();
      } else {
        return res.status(400).json({
          success: false,
          message: "Either ticket ID or ticketCode is required"
        });
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found"
        });
      }

      // If there are no comments, return early
      if (!ticket.comments || ticket.comments.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Ticket details retrieved successfully",
          data: {
            ...ticket,
            clientResolved: ticket.clientResolved || false,
            clientResolvedAt: ticket.clientResolvedAt,
            comments: [],
            commentCount: 0
          }
        });
      }

      const commentUserIds = [...new Set(ticket.comments.map(comment => comment.createdBy.toString()))];

      const [admins, employees, clients] = await Promise.all([
        Admin.find({ _id: { $in: commentUserIds } }).select('_id'),
        Employee.find({ _id: { $in: commentUserIds } }).select('_id firstName lastName'),
        Client.find({ _id: { $in: commentUserIds } }).select('_id companyName contactPerson')
      ]);

      const adminMap = new Map(admins.map(admin => [admin._id.toString(), "Admin"]));
      const employeeMap = new Map(
        employees.map(emp => [emp._id.toString(), `${emp.firstName} ${emp.lastName}`])
      );
      const clientMap = new Map(
        clients.map(client => [client._id.toString(), client.contactPerson || client.companyName])
      );

      const enrichedComments = ticket.comments.map(comment => {
        const userId = comment.createdBy.toString();
        let authorName = 'Unknown User';

        if (adminMap.has(userId)) {
          authorName = "Admin";
        } else if (employeeMap.has(userId)) {
          authorName = employeeMap.get(userId) || authorName;
        } else if (clientMap.has(userId)) {
          authorName = clientMap.get(userId) || authorName;
        }

        return {
          id: comment._id,
          text: comment.text,
          createdAt: comment.createdAt,
          authorName
        };
      });

      enrichedComments.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.status(200).json({
        success: true,
        message: "Ticket details retrieved successfully",
        data: {
          ...ticket,
          clientResolved: ticket.clientResolved || false,
          clientResolvedAt: ticket.clientResolvedAt,
          comments: enrichedComments,
          commentCount: enrichedComments.length
        }
      });

    } catch (error) {
      console.error('Error retrieving ticket details:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving ticket details",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async createInvoice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Admin ID is missing"
        });
      }

      const adminId = req.user.id;
      const invoiceData: CreateInvoiceDto = req.body;

      // Validate required fields
      if (!invoiceData.client_id || !invoiceData.amount || !invoiceData.dueDate) {
        return res.status(400).json({
          success: false,
          message: "Client ID, amount, and due date are required"
        });
      }

      // Validate client exists
      if (!Types.ObjectId.isValid(invoiceData.client_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID format"
        });
      }

      const client = await Client.findById(invoiceData.client_id);
      if (!client) {
        return res.status(400).json({
          success: false,
          message: "Client not found"
        });
      }

      // Validate project if provided
      if (invoiceData.project_id) {
        if (!Types.ObjectId.isValid(invoiceData.project_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid project ID format"
          });
        }

        const project = await Project.findById(invoiceData.project_id);
        if (!project) {
          return res.status(400).json({
            success: false,
            message: "Project not found"
          });
        }
      }

      // Create invoice - will auto-generate invoice_id
      const invoice = new Invoice({
        client_id: new Types.ObjectId(invoiceData.client_id),
        project_id: invoiceData.project_id ? new Types.ObjectId(invoiceData.project_id) : undefined,
        amount: invoiceData.amount,
        description: invoiceData.description,
        invoiceDate: invoiceData.invoiceDate || new Date(),
        dueDate: new Date(invoiceData.dueDate),
        status: 'Pending',
        createdBy: new Types.ObjectId(adminId)
      });

      const savedInvoice = await invoice.save();

      // Populate for response
      await savedInvoice.populate('client_id', 'companyName contactPerson email');
      if (savedInvoice.project_id) {
        await savedInvoice.populate('project_id', 'projectName');
      }

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: savedInvoice
      });

    } catch (error) {
      console.error('Error creating invoice:', error);
      return res.status(500).json({
        success: false,
        message: "Error creating invoice",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async updateInvoice(req: Request, res: Response): Promise<Response> {
    try {
      const updateData: UpdateInvoiceDto = req.body;

      // Validate that we have at least one identifier
      if (!updateData.id && !updateData.invoice_id) {
        return res.status(400).json({
          success: false,
          message: "Either id or invoice_id is required"
        });
      }

      // Find the invoice to update
      let invoice;
      if (updateData.id && Types.ObjectId.isValid(updateData.id)) {
        invoice = await Invoice.findById(updateData.id);
      } else if (updateData.invoice_id) {
        invoice = await Invoice.findOne({ invoice_id: updateData.invoice_id });
      }

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      // Updates to apply
      const updates: any = {};

      // Update amount if provided
      if (updateData.amount !== undefined) {
        if (updateData.amount <= 0) {
          return res.status(400).json({
            success: false,
            message: "Amount must be greater than zero"
          });
        }
        updates.amount = updateData.amount;
      }

      // Update description if provided
      if (updateData.description !== undefined) {
        updates.description = updateData.description;
      }

      // Update dueDate if provided
      if (updateData.dueDate) {
        updates.dueDate = new Date(updateData.dueDate);
      }

      // Update status if provided
      if (updateData.status) {
        if (!['Pending', 'Paid', 'Overdue'].includes(updateData.status)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status. Must be 'Pending', 'Paid', or 'Overdue'"
          });
        }

        updates.status = updateData.status;

        // If status is changed to Paid, set payment date
        if (updateData.status === 'Paid' && !invoice.paymentDate) {
          updates.paymentDate = updateData.paymentDate || new Date();
        }
      }

      // Apply updates
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        invoice._id,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .populate('client_id', 'companyName contactPerson email')
        .populate('project_id', 'projectName')
        .populate('createdBy', 'username');

      return res.status(200).json({
        success: true,
        message: "Invoice updated successfully",
        data: updatedInvoice
      });

    } catch (error) {
      console.error('Error updating invoice:', error);
      return res.status(500).json({
        success: false,
        message: "Error updating invoice",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getInvoice(req: Request, res: Response): Promise<Response> {
    try {
      const invoiceData: GetInvoiceDto = req.body;

      // Validate that we have at least one identifier
      if (!invoiceData.id && !invoiceData.invoice_id) {
        return res.status(400).json({
          success: false,
          message: "Either id or invoice_id is required"
        });
      }

      // Find the invoice
      let invoice;
      if (invoiceData.id && Types.ObjectId.isValid(invoiceData.id)) {
        invoice = await Invoice.findById(invoiceData.id);
      } else if (invoiceData.invoice_id) {
        invoice = await Invoice.findOne({ invoice_id: invoiceData.invoice_id });
      }

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      // Populate references
      await invoice.populate('client_id', 'companyName contactPerson email');
      if (invoice.project_id) {
        await invoice.populate('project_id', 'projectName');
      }
      await invoice.populate('createdBy', 'username');

      return res.status(200).json({
        success: true,
        message: "Invoice retrieved successfully",
        data: invoice
      });

    } catch (error) {
      console.error('Error retrieving invoice:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving invoice",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async listInvoices(req: Request, res: Response): Promise<Response> {
    try {
      const { client_id, status, fromDate, toDate } = req.query;

      // Build query
      const query: any = {};

      // Filter by client_id if provided
      if (client_id && Types.ObjectId.isValid(client_id as string)) {
        query.client_id = new Types.ObjectId(client_id as string);
      }

      // Filter by status if provided
      if (status) {
        if (!['Pending', 'Paid', 'Overdue'].includes(status as string)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status. Must be 'Pending', 'Paid', or 'Overdue'"
          });
        }
        query.status = status;
      }

      // Filter by date range if provided
      if (fromDate || toDate) {
        query.invoiceDate = {};
        if (fromDate) {
          query.invoiceDate.$gte = new Date(fromDate as string);
        }
        if (toDate) {
          query.invoiceDate.$lte = new Date(toDate as string);
        }
      }

      // Get invoices
      const invoices = await Invoice.find(query)
        .sort({ invoiceDate: -1 })
        .populate('client_id', 'companyName contactPerson')
        .populate('project_id', 'projectName')
        .populate('createdBy', 'username');

      // Statistics
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
      const paidAmount = invoices
        .filter(invoice => invoice.status === 'Paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const pendingAmount = invoices
        .filter(invoice => invoice.status === 'Pending')
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const overdueAmount = invoices
        .filter(invoice => invoice.status === 'Overdue')
        .reduce((sum, invoice) => sum + invoice.amount, 0);

      const summary = {
        total: invoices.length,
        totalAmount,
        pending: invoices.filter(invoice => invoice.status === 'Pending').length,
        pendingAmount,
        paid: invoices.filter(invoice => invoice.status === 'Paid').length,
        paidAmount,
        overdue: invoices.filter(invoice => invoice.status === 'Overdue').length,
        overdueAmount
      };

      return res.status(200).json({
        success: true,
        message: "Invoices retrieved successfully",
        summary,
        data: invoices
      });

    } catch (error) {
      console.error('Error retrieving invoices:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving invoices",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async deleteInvoice(req: Request, res: Response): Promise<Response> {
    try {
      const invoiceData: DeleteInvoiceDto = req.body;

      // Validate that we have at least one identifier
      if (!invoiceData.id && !invoiceData.invoice_id) {
        return res.status(400).json({
          success: false,
          message: "Either id or invoice_id is required"
        });
      }

      // Find the invoice
      let invoice;
      if (invoiceData.id && Types.ObjectId.isValid(invoiceData.id)) {
        invoice = await Invoice.findById(invoiceData.id);
      } else if (invoiceData.invoice_id) {
        invoice = await Invoice.findOne({ invoice_id: invoiceData.invoice_id });
      }

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }

      // Don't allow deletion of paid invoices
      if (invoice.status === 'Paid') {
        return res.status(400).json({
          success: false,
          message: "Paid invoices cannot be deleted"
        });
      }

      // Delete the invoice
      await Invoice.findByIdAndDelete(invoice._id);

      return res.status(200).json({
        success: true,
        message: "Invoice deleted successfully"
      });

    } catch (error) {
      console.error('Error deleting invoice:', error);
      return res.status(500).json({
        success: false,
        message: "Error deleting invoice",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get ticket timeline for admin
   * Shows key events in chronological order
   */
  async getTicketTimeline(req: Request, res: Response): Promise<Response> {
    try {
      const { ticketId } = req.body;

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required"
        });
      }

      // Define interfaces for the populated fields
      interface PopulatedClient {
        _id: Types.ObjectId;
        companyName?: string;
        contactPerson?: string;
      }

      interface PopulatedEmployee {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
        employee_id?: string;
      }

      // Fetch the ticket with necessary fields with proper type annotations
      const ticket = await Ticket.findById(ticketId)
        .populate<{ client_id: PopulatedClient }>('client_id', 'companyName contactPerson')
        .populate<{ assignedTo: PopulatedEmployee }>('assignedTo', 'firstName lastName employee_id')
        .select('ticketCode title status priority createdAt clientResolved clientResolvedAt comments')
        .lean();

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found"
        });
      }

      // Define proper interfaces for timeline events
      interface TimelineBaseData {
        ticketCode: string;
        title: string;
        priority: 'Low' | 'Medium' | 'High';
        client: string | { name: string };
      }

      interface TimelineAssignmentData {
        assignee: {
          name: string;
          employee_id?: string;
        };
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

      // Type for the timeline events
      type TimelineEvent =
        | { type: 'creation'; title: string; date: Date; data: TimelineBaseData }
        | { type: 'assignment'; title: string; date: Date; data: TimelineAssignmentData }
        | { type: 'client_resolution'; title: string; date: Date; data: TimelineResolutionData }
        | { type: 'resolution'; title: string; date: Date; data: TimelineStatusData }
        | { type: 'comments'; title: string; date: Date; data: TimelineCommentData };

      // Initialize timeline array with proper typing
      const timeline: TimelineEvent[] = [];

      // 1. Generate base timeline data
      timeline.push({
        type: 'creation',
        title: 'Ticket Created',
        date: ticket.createdAt,
        data: {
          ticketCode: ticket.ticketCode,
          title: ticket.title,
          priority: ticket.priority,
          client: ticket.client_id ? {
            name: ticket.client_id.companyName || ticket.client_id.contactPerson || 'Unknown',
          } : 'Unknown Client'
        }
      });

      // 2. Add assignment event if available
      if (ticket.assignedTo) {
        timeline.push({
          type: 'assignment',
          title: 'Ticket Assigned',
          date: ticket.createdAt, // No specific assignment date in schema, using creation date
          data: {
            assignee: {
              name: `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`,
              employee_id: ticket.assignedTo.employee_id
            }
          }
        });
      }

      // 3. Add client resolution event if it exists
      if (ticket.clientResolved && ticket.clientResolvedAt) {
        timeline.push({
          type: 'client_resolution',
          title: 'Marked as Resolved by Client',
          date: ticket.clientResolvedAt,
          data: {
            resolvedByClient: true
          }
        });
      }

      // 4. Add status resolution event if applicable
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        // For this event, we need to find the most recent status update comment
        // or use current date if no such comment exists
        const statusUpdateComment = ticket.comments?.find(comment =>
          comment.text.includes('Status updated to "Resolved"') ||
          comment.text.includes('Status updated to "Closed"')
        );

        timeline.push({
          type: 'resolution',
          title: `Ticket ${ticket.status}`,
          date: statusUpdateComment?.createdAt || new Date(),
          data: {
            status: ticket.status
          }
        });
      }

      // 5. Get comments info
      const totalComments = ticket.comments?.length || 0;
      const latestComment = ticket.comments && ticket.comments.length > 0
        ? [...ticket.comments].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
        : null;

      // Get author info for latest comment if exists
      let latestCommentAuthor: string = 'Unknown';
      if (latestComment) {
        // Find the author from the appropriate collection
        const [admin, employee, client] = await Promise.all([
          Admin.findById(latestComment.createdBy).select('_id').lean(),
          Employee.findById(latestComment.createdBy).select('firstName lastName').lean(),
          Client.findById(latestComment.createdBy).select('companyName contactPerson').lean()
        ]);

        if (admin) latestCommentAuthor = 'Admin';
        else if (employee && 'firstName' in employee && 'lastName' in employee) {
          latestCommentAuthor = `${employee.firstName} ${employee.lastName}`;
        }
        else if (client && ('companyName' in client || 'contactPerson' in client)) {
          latestCommentAuthor = client.contactPerson || client.companyName || 'Client';
        }
      }

      // Add comment activity summary to timeline
      if (totalComments > 0 && latestComment) {
        timeline.push({
          type: 'comments',
          title: 'Comment Activity',
          date: latestComment.createdAt || ticket.createdAt,
          data: {
            totalComments,
            latestComment: latestComment ? {
              text: latestComment.text?.substring(0, 50) + (latestComment.text?.length > 50 ? '...' : ''),
              date: latestComment.createdAt,
              author: latestCommentAuthor
            } : null
          }
        });
      }

      // 6. Sort timeline events by date
      timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
          timeline
        }
      });

    } catch (error) {
      console.error('Error retrieving ticket timeline:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving ticket timeline",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async getClientProjects(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const clientId = req.params?.id;

      if (!isValidObjectId(clientId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Client Id"
        });
      }

      const { status } = req.query;

      // Build query - find projects assigned to this client
      const query: any = { client: new Types.ObjectId(clientId) };

      // Add status filter if provided
      if (status) {
        if (!['Not Started', 'In Progress', 'Completed', 'On Hold'].includes(status as string)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status value. Must be 'Not Started', 'In Progress', 'Completed', or 'On Hold'"
          });
        }
        query.status = status;
      }

      // Find projects
      const projects = await Project.find(query)
        .sort({ startDate: 1 }) // Sort by start date (ascending)
        .populate('teamLeaders', 'firstName lastName employee_id')
        .populate('teamMembers', 'firstName lastName employee_id')
        .populate('managers', 'firstName lastName employee_id')
        .populate('created_by', 'firstName lastName employee_id')
        .lean();

      // Calculate summary statistics
      const total = projects.length;
      const completed = projects.filter(project => project.status === 'Completed').length;
      const inProgress = projects.filter(project => project.status === 'In Progress').length;
      const notStarted = projects.filter(project => project.status === 'Not Started').length;
      const onHold = projects.filter(project => project.status === 'On Hold').length;
      const highPriority = projects.filter(project => project.priority === 'High').length;

      // Calculate completion percentage
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Calculate overall progress including in-progress projects (weighted calculation)
      let overallProgress = 0;
      if (total > 0) {
        // Assign weights: Completed = 100%, In Progress = 50%, Not Started = 0%, On Hold = counted but no progress
        overallProgress = Math.round(
          ((completed * 100) + (inProgress * 50)) / total
        );
      }

      const summary = {
        total,
        completed,
        notStarted,
        inProgress,
        onHold,
        highPriority,
        completionPercentage,
        overallProgress
      };

      // Format projects for response
      const formattedProjects = projects.map(project => {
        // Add type assertion for teamLeaders
        const teamLeadersArray = project.teamLeaders as unknown as Array<{
          firstName: string;
          lastName: string;
          employee_id: string;
        }>;

        const teamLeader = teamLeadersArray && teamLeadersArray.length > 0
          ? `${teamLeadersArray[0].firstName} ${teamLeadersArray[0].lastName}`
          : 'Not assigned';

        const daysToStart = project.status === 'Not Started' ?
          Math.ceil((new Date(project.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

        const daysRemaining = project.status !== 'Completed' ?
          Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

        // Calculate individual project progress percentage
        let progressPercentage = 0;
        switch (project.status) {
          case 'Completed':
            progressPercentage = 100;
            break;
          case 'In Progress':
            // Calculate based on timeline - if halfway through timeline, assume 50% complete
            const totalDuration = new Date(project.endDate).getTime() - new Date(project.startDate).getTime();
            const elapsedDuration = new Date().getTime() - new Date(project.startDate).getTime();

            if (totalDuration > 0) {
              progressPercentage = Math.min(
                Math.round((elapsedDuration / totalDuration) * 100),
                99 // Cap at 99% for in-progress projects
              );
              // Minimum 10% for just started projects
              progressPercentage = Math.max(progressPercentage, 10);
            }
            break;
          case 'Not Started':
            progressPercentage = 0;
            break;
          case 'On Hold':
            // For on hold, show the progress at the time it was paused (estimate)
            const totalDays = (new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24);
            const elapsedDays = (new Date().getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24);

            if (totalDays > 0) {
              progressPercentage = Math.min(
                Math.round((elapsedDays / totalDays) * 100 * 0.5), // Only count 50% of elapsed time for on-hold
                75 // Cap at 75% for on-hold projects
              );
            }
            break;
        }

        return {
          id: project._id,
          projectName: project.projectName,
          description: project.projectDescription,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          priority: project.priority,
          teamSize: (project.teamMembers?.length || 0) + (project.teamLeaders?.length || 0),
          leadContact: teamLeader,
          progressPercentage,
          timeframe: {
            daysToStart: daysToStart > 0 ? daysToStart : 0,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            isOverdue: project.status !== 'Completed' && new Date(project.endDate) < new Date()
          },
          tags: project.tags || [],
          value: project.projectValue
        };
      });

      return res.status(200).json({
        success: true,
        message: "Projects retrieved successfully",
        summary,
        projects: formattedProjects
      });

    } catch (error) {
      console.error('Error retrieving projects:', error);

      return res.status(500).json({
        success: false,
        message: "Error retrieving projects",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getReviews(req: Request, res: Response): Promise<Response> {
    try {
      const { user_id } = req.query;

      // Build query
      const query: any = {};

      // Filter by client if provided
      if (user_id && Types.ObjectId.isValid(user_id as string)) {
        query.user_id = new Types.ObjectId(user_id as string);
      }

      const reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .populate('user_id', 'contactPerson')
        .lean();

      const formattedReviews = reviews.map(review => ({
        id: review._id,
        user_id: review.user_id?._id,
        userName: (review.user_id as any)?.contactPerson,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      }));

      return res.status(200).json({
        success: true,
        message: "reviews retrieved successfully",
        data: formattedReviews
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving reviews",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async deleteReview(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "review id is required"
        });
      }

      // Find review
      let review;
      if (id && Types.ObjectId.isValid(id)) {
        review = await Review.findById(id);
      }

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "review not found"
        });
      }

      // Delete the review
      await Review.findByIdAndDelete(review._id);

      return res.status(200).json({
        success: true,
        message: `review ${id} deleted successfully`
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error deleting review",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async getEmployeeSkills(req: AuthRequest, res: Response): Promise<Response> {
      try {
        const {id} = req.params;

        if (!isValidObjectId(id)) {
          return res.status(401).json({
            success: false,
            message: "Employee ID is missing"
          });
        }
    
        // Find all skills for this employee, sorted by name
        const skills = await Skill.find({
          employee_id: new Types.ObjectId(id)
        }).sort({ name: 1 });
    
        return res.status(200).json({
          success: true,
          message: "Skills retrieved successfully",
          data: skills
        });
    
      } catch (error) {
        console.error('Error retrieving skills:', error);
        return res.status(500).json({
          success: false,
          message: "Error retrieving skills",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  

async getEmpAttendanceAnalytics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const employeeId = req.params.id;

      if (!isValidObjectId(employeeId)) {
        return res.status(401).json({
          success: false,
          message: "Employee ID is missing"
        });
      }
      
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
        date: { $gte: today, $lt: tomorrow }
      });
  
      // Calculate today's hours
      let hoursToday = 0;
      let currentStatus = 'Not Checked In';
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
          hoursToday = Number(((now.getTime() - todayAttendance.punchIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
          currentStatus = 'Working';
        }
      }
  
      // Get weekly hours
      const weeklyLogs = await AttendanceLog.find({
        employee_id: employeeId,
        date: { $gte: startOfWeek, $lt: tomorrow }
      });
      
      let hoursThisWeek = 0;
      weeklyLogs.forEach(log => {
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
        date: { $gte: startOfMonth, $lt: tomorrow }
      });
      
      let hoursThisMonth = 0;
      monthlyLogs.forEach(log => {
        if (log.punchOut) {
          hoursThisMonth += log.totalHours;
        }
      });
      
      // Add today's ongoing hours if still punched in
      if (isPunchedIn) {
        hoursThisMonth += hoursToday;
      }
      
      // Calculate attendance status counts for current month
      const presentDays = monthlyLogs.filter(log => log.status === 'Present').length;
      const halfDays = monthlyLogs.filter(log => log.status === 'Half-Day').length;
      const absentDays = monthlyLogs.filter(log => log.status === 'Absent').length;
  
      // Calculate total expected workdays in the month so far
      const workdaysInMonthSoFar = this.getWeekdaysCount(startOfMonth, today);
      
      // Calculate attendance percentage
      const attendancePercentage = workdaysInMonthSoFar > 0 
        ? Math.round(((presentDays + (halfDays * 0.5)) / workdaysInMonthSoFar) * 100) 
        : 0;
  
      // Format the time for display
      const formatTime = (hours: number): string => {
        const totalMinutes = Math.round(hours * 60);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        
        if (hrs === 0) {
          return `${mins} minutes`;
        } else if (mins === 0) {
          return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
        } else {
          return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} minutes`;
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
            isPunchedIn
          },
          summary: {
            hoursThisWeek: Number(hoursThisWeek.toFixed(2)),
            hoursThisWeekDisplay: formatTime(hoursThisWeek),
            hoursThisMonth: Number(hoursThisMonth.toFixed(2)),
            hoursThisMonthDisplay: formatTime(hoursThisMonth),
            attendancePercentage,
            presentDays,
            halfDays,
            absentDays
          },
          standardHours: {
            daily: 8,
            weekly: 40,
            monthly: workdaysInMonthSoFar * 8
          }
        }
      });
      
    } catch (error) {
      console.error('Error retrieving attendance analytics:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving attendance analytics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

}




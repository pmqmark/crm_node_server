import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Employee from "../models/employee";
import Department from "../models/department";
import Role from '../models/role';
import { IEmployee, User } from '../dtos/userdto';
import { EmployeeUpdateFields } from '../dtos/employeedto';
import AttendanceLog from '../models/logs';
import Leave, { LeaveType } from '../models/leave';
import { Project } from '../models/projects';
import Task from '../models/tasks';
import Skill from '../models/skill';
import Todo from '../models/todo';

export interface AuthRequest extends Request {
  user?: User;
}

interface IPopulatedProject {
  _id: Types.ObjectId;
  projectName: string;
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

export class EmployeeController {

  async updateEmployee(req: Request, res: Response): Promise<Response> {
    try {
      const updateData: EmployeeUpdateFields = req.body;
      
      // Validate if employee_id is provided
      if (!updateData.employee_id) {
        return res.status(400).json({
          message: 'employee_id is required'
        });
      }
      
      // Check if employee exists
      const existingEmployee = await Employee.findOne({
        employee_id: updateData.employee_id
      });
      
      if (!existingEmployee) {
        return res.status(404).json({
          message: `Employee with ID ${updateData.employee_id} not found`
        });
      }
      
      const updateFields: EmployeeUpdateFields = {};
      
      // Map all required fields from the model
      const fields = [
        'employee_id',
        'firstName',
        'lastName',
        'phone',
        'hireDate',
        'dob',
        'addressline1',
        'addressline2',
        'city',
        'state',
        'country',
        'postalcode',
        'employeebio'
      ];
  
      fields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });
  
      // Handle optional reference fields
      if (updateData.department_id) {
        if (!Types.ObjectId.isValid(updateData.department_id)) {
          return res.status(400).json({
            message: `Invalid department_id format: ${updateData.department_id}`
          });
        }
        
        const departmentExists = await Department.exists({
          _id: new Types.ObjectId(updateData.department_id)
        });
        
        if (!departmentExists) {
          return res.status(404).json({
            message: `Department with ID ${updateData.department_id} not found`
          });
        }
        updateFields.department_id = new Types.ObjectId(updateData.department_id);
      }
      
      if (updateData.role_id) {
        if (!Types.ObjectId.isValid(updateData.role_id)) {
          return res.status(400).json({
            message: `Invalid role_id format: ${updateData.role_id}`
          });
        }
        
        const roleExists = await Role.exists({
          _id: new Types.ObjectId(updateData.role_id)
        });
        
        if (!roleExists) {
          return res.status(404).json({
            message: `Role with ID ${updateData.role_id} not found`
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
          runValidators: true
        }
      );
      
      if (!updatedEmployee) {
        return res.status(500).json({
          message: 'Employee update failed'
        });
      }
      
      return res.status(200).json({
        message: 'Employee updated successfully',
        data: updatedEmployee
      });
      
    } catch (error) {
      return res.status(500).json({
        message: "Error updating employee",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
 
  

  async listEmployees(req: Request, res: Response): Promise<Response> {
    try {
      const employees = await Employee.find();

      return res.status(200).json({
        message: "Employees retrieved successfully",
        data: employees
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
                message: "Unauthorized: User ID is missing"
            });
        }

        const { taskId, status, description } = req.body;

        if (!taskId || !Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({
                message: "Invalid task ID"
            });
        }

        // Find the task and ensure the employee is assigned to it
        const task = await Task.findOne({
            _id: taskId,
            assigned_employees: req.user.id
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found or you're not assigned to this task"
            });
        }

        // Prepare update object with type safety
        const updateData: Partial<{ status: string; description: string }> = {};

        if (status) {
            if (!['Pending', 'In Progress', 'Completed', 'On Hold'].includes(status)) {
                return res.status(400).json({
                    message: "Invalid status value"
                });
            }
            updateData.status = status;
        }

        if (description) {
            updateData.description = description;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: "No valid update fields provided"
            });
        }

        // Update the task with proper type assertion
        const updatedTask = await Task.findByIdAndUpdate<IUpdatedTask>(
            taskId,
            { $set: updateData },
            { new: true }
        ).populate('project_id', 'projectName');

        if (!updatedTask) {
            return res.status(500).json({
                message: "Failed to update task"
            });
        }

        return res.status(200).json({
            message: "Task updated successfully",
            data: {
                taskId: updatedTask._id,
                description: updatedTask.description,
                status: updatedTask.status,
                projectName: updatedTask.project_id?.projectName || 'No Project',
                createdAt: updatedTask.createdAt,
                updatedAt: updatedTask.updatedAt
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error updating task",
            error: error instanceof Error ? error.message : "Unknown error"
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
  

  async searchEmployee(req: Request, res: Response): Promise<Response> {
    try {
      const { id, employee_id, firstName, department_id } = req.query;
      const searchQuery: any = {};

     
      if (!id && !employee_id && !firstName && !department_id) {
        return res.status(400).json({
          message: "At least one search parameter (id, employee_id, firstName, or department_id) is required"
        });
      }

      
      if (id) {
        if (!Types.ObjectId.isValid(id as string)) {
          return res.status(400).json({
            message: `Invalid id format: ${id}`
          });
        }
        searchQuery._id = new Types.ObjectId(id as string);
      }

     
      if (employee_id) {
        searchQuery.employee_id = employee_id;
      }

     
      if (firstName) {
        const searchRegex = new RegExp(firstName as string, 'i');
        searchQuery.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex }
        ];
      }

      
      if (department_id) {
        if (!Types.ObjectId.isValid(department_id as string)) {
          return res.status(400).json({
            message: `Invalid department_id format: ${department_id}`
          });
        }
        searchQuery.department_id = new Types.ObjectId(department_id as string);
      }

      const employees = await Employee.find(searchQuery)
        .populate('department_id', 'name')
        .populate('role_id', 'name')
        .select('-password');

      if (employees.length === 0) {
        return res.status(404).json({
          message: "No employees found matching the search criteria"
        });
      }

      return res.status(200).json({
        message: "Employees found successfully",
        count: employees.length,
        data: employees
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error searching employees",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async deleteEmployee(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.body; 
    
      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: `Invalid ID format: ${id}`
        });
      }
  
     
      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({
          message: "Employee not found"
        });
      }
  
      
      await Employee.findByIdAndDelete(id);
  
      return res.status(200).json({
        message: "Employee deleted successfully"
      });
  
    } catch (error) {
      return res.status(500).json({
        message: "Error deleting employee",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async applyLeave(req: AuthRequest, res: Response): Promise<Response> {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                message: "Unauthorized: User ID is missing"
            });
        }

        const { 
            leaveType, 
            fromDate, 
            toDate, 
            reason 
        } = req.body;

        // Validate required fields
        if (!leaveType || !fromDate || !toDate || !reason) {
            return res.status(400).json({
                message: "Missing required fields: leaveType, fromDate, toDate, and reason are required"
            });
        }

        // Validate leave type
        if (!Object.values(LeaveType).includes(leaveType)) {
            return res.status(400).json({
                message: "Invalid leave type. Must be one of: Medical Leave, Casual Leave, or Vacation"
            });
        }

        // Convert dates
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);

        // Validate dates
        if (startDate > endDate) {
            return res.status(400).json({
                message: "End date must be after start date"
            });
        }

        if (startDate < new Date()) {
            return res.status(400).json({
                message: "Cannot apply leave for past dates"
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
                    toDate: { $gte: startDate }
                }
            ]
        });

        if (existingLeave) {
            return res.status(400).json({
                message: "You already have a leave request for these dates"
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
            status: 'Pending'
        });

        return res.status(201).json({
            message: "Leave application submitted successfully",
            data: leave
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error applying for leave",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

async checkIn(req: AuthRequest, res: Response): Promise<Response> {
  try {
      if (!req.user || !req.user.id) {
          return res.status(401).json({
              message: "Unauthorized: User ID is missing"
          });
      }

      const employee_id = req.user.id;

      // Check only if user has an active session (not checked out)
      const activeSession = await AttendanceLog.findOne({
          employee_id,
          punchOut: null
      });

      if (activeSession) {
          return res.status(400).json({
              message: "You have an active session. Please check out first"
          });
      }

      // Create new attendance log
      const attendanceLog = await AttendanceLog.create({
          employee_id,
          date: new Date(),
          punchIn: new Date(),
          status: 'Present'
      });

      return res.status(201).json({
          message: "Check-in successful",
          data: attendanceLog
      });

  } catch (error) {
      return res.status(500).json({
          message: "Error during check-in",
          error: error instanceof Error ? error.message : "Unknown error"
      });
  }
}


async checkPunchStatus(req: AuthRequest, res: Response): Promise<Response> {
  try {
      if (!req.user || !req.user.id) {
          return res.status(401).json({
              message: "Unauthorized: User ID is missing"
          });
      }

      const employee_id = req.user.id;

      // Find the most recent attendance log
      const latestLog = await AttendanceLog.findOne({
          employee_id
      })
      .sort({ date: -1, punchIn: -1 })
      .select('date punchIn punchOut status');

      if (!latestLog) {
          return res.status(200).json({
              message: "No attendance records found",
              data: {
                  isPunchedIn: false,
                  lastActivity: null
              }
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
                  status: latestLog.status
              }
          }
      });

  } catch (error) {
      return res.status(500).json({
          message: "Error checking punch status",
          error: error instanceof Error ? error.message : "Unknown error"
      });
  }
}



async getMyTasks(req: AuthRequest, res: Response): Promise<Response> {
  try {
      if (!req.user || !req.user.id) {
          return res.status(401).json({
              message: "Unauthorized: User ID is missing"
          });
      }

      const { status } = req.query;
      const query: any = {
          assigned_employees: req.user.id
      };

      if (status && ['Pending', 'In Progress', 'Completed', 'On Hold'].includes(status as string)) {
          query.status = status;
      }

      const tasks = await Task.find(query)
          .populate<{ project_id: IPopulatedProject }>('project_id', 'projectName')
          .sort({ createdAt: -1 });

      if (tasks.length === 0) {
          return res.status(200).json({
              message: "No tasks found",
              data: []
          });
      }

      const enrichedTasks = tasks.map(task => ({
          taskId: task._id,
          description: task.description,
          status: task.status,
          projectName: task.project_id?.projectName || 'No Project',
          createdAt: task.createdAt
      }));

      return res.status(200).json({
          message: "Tasks retrieved successfully",
          count: enrichedTasks.length,
          data: enrichedTasks
      });

  } catch (error) {
      return res.status(500).json({
          message: "Error retrieving tasks",
          error: error instanceof Error ? error.message : "Unknown error"
      });
  }
}
async getAssignedProjects(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized: User ID is missing"
      });
    }

    const employeeId = req.user.id;
    
    const assignedProjects = await Project.find({
      $or: [
        { teamMembers: employeeId },
        { teamLeaders: employeeId },
        { managers: employeeId }
      ]
    })
    .populate<{ teamLeaders: IEmployee[] }>({
      path: 'teamLeaders',
      model: 'Employee',
      select: 'firstName lastName employee_id',
      options: { limit: 1 }
    })
    .select('projectName startDate endDate teamLeaders status')
    .sort({ startDate: 1 });

    const simplifiedProjects = assignedProjects.map(project => {
      const leader = project.teamLeaders?.[0];
      return {
        projectName: project.projectName,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        teamLead: leader ? {
          name: `${leader.firstName} ${leader.lastName}`,
          employeeId: leader.employee_id
        } : {
          name: 'No Lead Assigned', 
          employeeId: null
        }
      };
    });

    return res.status(200).json({
      message: "Projects retrieved successfully",
      count: simplifiedProjects.length,
      data: simplifiedProjects
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving assigned projects", 
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async assignTask(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
          message: "Unauthorized: User ID is missing"
      });
  }

  // Check if user has permission to assign tasks
  const assigningEmployee = await Employee.findById(req.user.id)
      .select('role_id');

  if (!assigningEmployee) {
      return res.status(404).json({
          message: "Employee not found"
      });
  }

  // Check if employee has the restricted role
  if (assigningEmployee.role_id?.toString() === '67eda86ae2b85e32ef56e328') {
      return res.status(403).json({
          message: "You don't have permission to assign tasks"
      });
  }
      const { 
          project_id, 
          assigned_employees, // Array of employee _ids
          description, 
          status = 'Pending' 
      } = req.body;

      // Validate required fields
      if (!project_id || !Array.isArray(assigned_employees) || !description) {
          return res.status(400).json({
              message: "Project ID, assigned employees array, and description are required"
          });
      }

      // Validate project exists
      const project = await Project.findById(project_id);
      if (!project) {
          return res.status(404).json({
              message: "Project not found"
          });
      }

      // Validate all employee IDs are valid ObjectIds
      const validObjectIds = assigned_employees.every(id => Types.ObjectId.isValid(id));
      if (!validObjectIds) {
          return res.status(400).json({
              message: "One or more employee IDs are not valid ObjectIds"
          });
      }

      // Validate employees exist using _id
      const validEmployees = await Employee.find({
          _id: { $in: assigned_employees.map(id => new Types.ObjectId(id)) }
      }).select('_id firstName lastName');

      if (validEmployees.length !== assigned_employees.length) {
          const foundIds = validEmployees.map(emp => emp._id.toString());
          const invalidIds = assigned_employees.filter(id => !foundIds.includes(id));
          
          return res.status(400).json({
              message: "Some employee IDs are invalid",
              invalidEmployees: invalidIds
          });
      }

      // Create new task
      const task = new Task({
          project_id,
          assigned_employees,
          description,
          status
      });

      const savedTask = await task.save();

      // Return response with employee details
      return res.status(201).json({
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
      return res.status(500).json({
          message: "Error assigning task",
          error: error instanceof Error ? error.message : "Unknown error"
      });
  }
}

async checkOut(req: AuthRequest, res: Response): Promise<Response> {
  try {
      if (!req.user || !req.user.id) {
          return res.status(401).json({
              message: "Unauthorized: User ID is missing"
          });
      }

      const employee_id = req.user.id;

      // Find active session
      const activeSession = await AttendanceLog.findOne({
          employee_id,
          punchOut: null
      });

      if (!activeSession) {
          return res.status(404).json({
              message: "No active session found. Please check in first"
          });
      }

      // Update punch-out time
      activeSession.punchOut = new Date();
      await activeSession.save(); // This will trigger the pre-save hook to calculate hours

      return res.status(200).json({
          message: "Check-out successful",
          data: activeSession
      });

  } catch (error) {
      return res.status(500).json({
          message: "Error during check-out",
          error: error instanceof Error ? error.message : "Unknown error"
      });
  }
}


  async findEmployee(req: AuthRequest, res: Response): Promise<Response> {
    try {
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing"
        });
      }

      console.log(req.user)
  
      const userId = req.user.id; 
  
      
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: `Invalid user ID format: ${userId}`
        });
      }
  

      const employee = await Employee.findById(userId)
        .populate('department_id', 'name')
        .populate('role_id', 'name')
        .select('-password'); 

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found"
        });
      }
  
      return res.status(200).json({
        message: "Employee found successfully",
        data: employee
      });
  
    } catch (error) {
      return res.status(500).json({
        message: "Error finding employee",
        error: error instanceof Error ? error.message : "Unknown error"
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
          message: "Unauthorized: User ID is missing"
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
        employee_id: new Types.ObjectId(employeeId)
      })
      .sort({ createdAt: -1 })
      .populate<{ approvedBy: IPopulatedEmployee }>('approvedBy', 'firstName lastName employee_id');
      
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
                vacation: 0
              },
              totalDaysTaken: 0
            },
            leaveHistory: []
          }
        });
      }
      
      // Calculate summary statistics
      const summary = {
        totalRequests: leaves.length,
        approved: leaves.filter(leave => leave.status === 'Approved').length,
        rejected: leaves.filter(leave => leave.status === 'Rejected').length,
        pending: leaves.filter(leave => leave.status === 'Pending').length,
        byType: {
          medical: leaves.filter(leave => leave.leaveType === LeaveType.MEDICAL).length,
          casual: leaves.filter(leave => leave.leaveType === LeaveType.CASUAL).length,
          vacation: leaves.filter(leave => leave.leaveType === LeaveType.VACATION).length
        },
        totalDaysTaken: leaves
          .filter(leave => leave.status === 'Approved')
          .reduce((total, leave) => total + leave.numberOfDays, 0)
      };
      
      // Format the leaves data for the response
      const formattedLeaves = leaves.map(leave => {
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
          approvedBy: leave.approvedBy ? {
            id: leave.approvedBy._id,
            name: `${leave.approvedBy.firstName} ${leave.approvedBy.lastName}`,
            employee_id: leave.approvedBy.employee_id
          } : null
        };
        
        return formattedLeave;
      });
      
      // Check for upcoming leave
      const today = new Date();
      const upcomingLeave = leaves.find(leave => 
        leave.status === 'Approved' && 
        new Date(leave.fromDate) > today
      );
      
      // Check for ongoing leave
      const ongoingLeave = leaves.find(leave => 
        leave.status === 'Approved' && 
        new Date(leave.fromDate) <= today && 
        new Date(leave.toDate) >= today
      );
      
      // Add status indicators
      const leaveStatus = {
        hasUpcomingLeave: !!upcomingLeave,
        upcomingLeave: upcomingLeave ? {
          id: upcomingLeave._id,
          leaveType: upcomingLeave.leaveType,
          fromDate: upcomingLeave.fromDate,
          toDate: upcomingLeave.toDate,
          daysRemaining: Math.ceil((new Date(upcomingLeave.fromDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        } : null,
        isCurrentlyOnLeave: !!ongoingLeave,
        ongoingLeave: ongoingLeave ? {
          id: ongoingLeave._id,
          leaveType: ongoingLeave.leaveType,
          fromDate: ongoingLeave.fromDate, 
          toDate: ongoingLeave.toDate,
          daysRemaining: Math.ceil((new Date(ongoingLeave.toDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        } : null
      };
      
      return res.status(200).json({
        success: true,
        message: "Leave history retrieved successfully",
        data: {
          summary,
          leaveStatus,
          leaveHistory: formattedLeaves
        }
      });
      
    } catch (error) {
      console.error('Error retrieving leave history:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving leave history",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async getMyProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const userId = req.user.id;
      
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid user ID format: ${userId}`
        });
      }
  
      // Get employee with populated references using proper TypeScript generics
      const employee = await Employee.findById(userId)
        .populate<{ department_id: IPopulatedDepartment }>('department_id', 'name description')
        .populate<{ role_id: IPopulatedRole }>('role_id', 'name description')
        .select('-password'); // Exclude password
  
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found"
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
        department: employee.department_id ? {
          id: employee.department_id._id,
          name: employee.department_id.name,
          description: employee.department_id.description
        } : null,
        role: employee.role_id ? {
          id: employee.role_id._id,
          name: employee.role_id.name,
          description: employee.role_id.description
        } : null,
        hireDate: employee.hireDate,
        dob: employee.dob,
        address: {
          addressline1: employee.addressline1,
          addressline2: employee.addressline2,
          city: employee.city,
          state: employee.state,
          country: employee.country,
          postalcode: employee.postalcode
        },
        bio: employee.employeebio,
        createdAt: employee.createdAt,
        lastLogin: employee.lastLogin
      };
  
      return res.status(200).json({
        success: true,
        message: "Employee profile retrieved successfully",
        data: profileData
      });
  
    } catch (error) {
      console.error('Error retrieving employee profile:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving employee profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get all colleagues in the same department, properly sorted and deduplicated
   * Returns department manager first, then team leads, then regular employees
   * Includes current user information
   */
  async getDepartmentColleagues(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
  
      // Get the current employee with their role details
      const currentEmployee = await Employee.findById(employeeId)
        .populate('role_id', 'name')
        .populate('department_id', 'name description');
  
      if (!currentEmployee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found"
        });
      }
  
      // Check if employee has a department assigned
      if (!currentEmployee.department_id) {
        return res.status(400).json({
          success: false,
          message: "You are not assigned to any department"
        });
      }
  
      // Safe way to access department_id properties with proper type handling
      const departmentId = typeof currentEmployee.department_id === 'string' 
        ? currentEmployee.department_id 
        : (currentEmployee.department_id as any)._id;
  
      // Get department details including the manager
      const department = await Department.findById(departmentId)
        .populate('manager_id', 'firstName lastName employee_id email phone');
  
      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found"
        });
      }
  
      // Find all employees in the same department (including current user)
      const departmentEmployees = await Employee.find({ 
        department_id: departmentId
      })
      .populate('role_id', 'name')
      .select('firstName lastName employee_id email phone role_id')
      .lean();
  
      // Get all roles to check for team leads
      const roles = await Role.find({});
      
      // Identify team lead roles (contains 'lead' or 'senior' in name)
      const teamLeadRoleIds = roles
        .filter(role => role.name.toLowerCase().includes('lead') || 
                      role.name.toLowerCase().includes('senior'))
        .map(role => role._id.toString());
  
      // Create a set of processed IDs to avoid duplicates
      const processedEmployeeIds = new Set<string>();
      const formattedEmployees: any[] = [];
  
      // First, add the manager if exists (and not the current employee)
      if (department.manager_id) {
        // Safe way to handle manager_id with proper type checking
        const managerId = typeof department.manager_id === 'string'
          ? department.manager_id
          : (department.manager_id as any)._id.toString();
          
        const manager = departmentEmployees.find(emp => emp._id.toString() === managerId);
        
        if (manager) {
          // Don't exclude the manager if they're the current employee - we'll handle this specifically 
          processedEmployeeIds.add(managerId);
  
          const roleObj = manager.role_id && typeof manager.role_id !== 'string' ? manager.role_id : null;
          const roleName = roleObj && (roleObj as any).name ? (roleObj as any).name : 'Department Manager';
  
          formattedEmployees.push({
            id: manager._id,
            name: `${manager.firstName || ''} ${manager.lastName || ''}`.trim(),
            employee_id: manager.employee_id || '',
            email: manager.email || '',
            phone: manager.phone || '',
            role: roleName,
            isManager: true,
            isTeamLead: false
          });
        }
      }
  
      // Add team leads next (not already added, not the current employee)
      departmentEmployees.forEach(emp => {
        // Skip if already processed
        if (processedEmployeeIds.has(emp._id.toString())) {
          return;
        }
  
        let isTeamLead = false;
        let roleName = 'No Role';
  
        if (emp.role_id) {
          // Safe way to handle role_id with proper type checking
          const roleObj = typeof emp.role_id !== 'string' ? emp.role_id : null;
          roleName = roleObj && (roleObj as any).name ? (roleObj as any).name : 'No Role';
          
          const roleId = roleObj ? (roleObj as any)._id.toString() : '';
          isTeamLead = teamLeadRoleIds.includes(roleId);
        }
  
        // Only add team leads in this pass
        if (isTeamLead) {
          processedEmployeeIds.add(emp._id.toString());
          
          formattedEmployees.push({
            id: emp._id,
            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
            employee_id: emp.employee_id || '',
            email: emp.email || '',
            phone: emp.phone || '',
            role: roleName,
            isManager: false,
            isTeamLead: true
          });
        }
      });
  
      // Add remaining regular employees (alphabetically)
      const regularEmployees = departmentEmployees
        .filter(emp => !processedEmployeeIds.has(emp._id.toString()))
        .sort((a, b) => {
          const aName = a.firstName || '';
          const bName = b.firstName || '';
          return aName.localeCompare(bName);
        });
  
      regularEmployees.forEach(emp => {
        let roleName = 'No Role';
        
        if (emp.role_id) {
          // Safe way to handle role_id with proper type checking
          const roleObj = typeof emp.role_id !== 'string' ? emp.role_id : null;
          roleName = roleObj && (roleObj as any).name ? (roleObj as any).name : 'No Role';
        }
        
        formattedEmployees.push({
          id: emp._id,
          name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          employee_id: emp.employee_id || '',
          email: emp.email || '',
          phone: emp.phone || '',
          role: roleName,
          isManager: false,
          isTeamLead: false
        });
      });
  
      // Extract the current employee
      const currentEmployeeInfo = formattedEmployees.find(
        emp => emp.id.toString() === employeeId.toString()
      );
      
      // Remove current employee from colleagues list
      const colleagues = formattedEmployees.filter(
        emp => emp.id.toString() !== employeeId.toString()
      );
  
      // Get role info for current user using type-safe approach
      let currentUserRole = 'No Role';
      let isCurrentUserManager = false;
      let isCurrentUserTeamLead = false;
      
      if (currentEmployee.role_id) {
        // Safe way to handle role_id with proper type checking
        const roleObj = currentEmployee.role_id;
        currentUserRole = typeof roleObj === 'string' 
          ? 'No Role' 
          : ((roleObj as any).name || 'No Role');
        
        // Check if team lead
        const roleId = typeof roleObj === 'string' 
          ? roleObj 
          : (roleObj as any)._id.toString();
          
        if (roleId && teamLeadRoleIds.includes(roleId)) {
          isCurrentUserTeamLead = true;
        }
      }
      
      // Check if department manager with proper type safety
      if (department.manager_id) {
        const managerId = typeof department.manager_id === 'string'
          ? department.manager_id
          : (department.manager_id as any)._id.toString();
          
        isCurrentUserManager = managerId === employeeId.toString();
      }
  
      // Safe way to access department properties
      const departmentName = department.name || '';
      const departmentDescription = department.description || '';
  
      return res.status(200).json({
        success: true,
        message: "Department colleagues retrieved successfully",
        data: {
          department: {
            id: department._id,
            name: departmentName,
            description: departmentDescription
          },
          currentUser: {
            id: currentEmployee._id,
            name: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
            employee_id: currentEmployee.employee_id,
            email: currentEmployee.email,
            phone: currentEmployee.phone || '',
            role: currentUserRole,
            isManager: isCurrentUserManager,
            isTeamLead: isCurrentUserTeamLead
          },
          colleagues
        }
      });
  
    } catch (error) {
      console.error('Error retrieving department colleagues:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving department colleagues",
        error: error instanceof Error ? error.message : "Unknown error"
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
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      const { name, proficiency } = req.body;
  
      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Skill name is required"
        });
      }
  
      // Validate proficiency is one of the allowed values
      const allowedProficiencies = [0, 25, 50, 75, 100];
      const proficiencyValue = proficiency ? Number(proficiency) : 0;
      
      if (!allowedProficiencies.includes(proficiencyValue)) {
        return res.status(400).json({
          success: false,
          message: "Proficiency must be one of: 0, 25, 50, 75, 100"
        });
      }
  
      // Check if skill already exists for this employee
      const existingSkill = await Skill.findOne({
        employee_id: new Types.ObjectId(employeeId),
        name: name
      });
  
      if (existingSkill) {
        return res.status(400).json({
          success: false,
          message: "You already have this skill registered. Use update instead."
        });
      }
  
      // Create the skill
      const skill = new Skill({
        employee_id: new Types.ObjectId(employeeId),
        name,
        proficiency: proficiencyValue,
        created_at: new Date(),
        updated_at: new Date()
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
          updated_at: savedSkill.updated_at
        }
      });
  
    } catch (error) {
      console.error('Error adding skill:', error);
      return res.status(500).json({
        success: false,
        message: "Error adding skill",
        error: error instanceof Error ? error.message : "Unknown error"
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
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      const { skillId, proficiency } = req.body;
  
      // Validate required fields
      if (!skillId || !Types.ObjectId.isValid(skillId)) {
        return res.status(400).json({
          success: false,
          message: "Valid skill ID is required"
        });
      }
  
      // Validate proficiency is one of the allowed values
      const allowedProficiencies = [0, 25, 50, 75, 100];
      const proficiencyValue = Number(proficiency);
      
      if (!allowedProficiencies.includes(proficiencyValue)) {
        return res.status(400).json({
          success: false,
          message: "Proficiency must be one of: 0, 25, 50, 75, 100"
        });
      }
  
      // Find the skill and ensure it belongs to the employee
      const skill = await Skill.findOne({
        _id: new Types.ObjectId(skillId),
        employee_id: new Types.ObjectId(employeeId)
      });
  
      if (!skill) {
        return res.status(404).json({
          success: false,
          message: "Skill not found or you don't have permission to edit it"
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
          updated_at: skill.updated_at
        }
      });
  
    } catch (error) {
      console.error('Error updating skill:', error);
      return res.status(500).json({
        success: false,
        message: "Error updating skill",
        error: error instanceof Error ? error.message : "Unknown error"
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
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      const { skillId } = req.body;
  
      // Validate required fields
      if (!skillId || !Types.ObjectId.isValid(skillId)) {
        return res.status(400).json({
          success: false,
          message: "Valid skill ID is required"
        });
      }
  
      // Find and delete the skill, ensuring it belongs to the employee
      const result = await Skill.findOneAndDelete({
        _id: new Types.ObjectId(skillId),
        employee_id: new Types.ObjectId(employeeId)
      });
  
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Skill not found or you don't have permission to delete it"
        });
      }
  
      return res.status(200).json({
        success: true,
        message: "Skill deleted successfully"
      });
  
    } catch (error) {
      console.error('Error deleting skill:', error);
      return res.status(500).json({
        success: false,
        message: "Error deleting skill",
        error: error instanceof Error ? error.message : "Unknown error"
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
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
  
      // Find all skills for this employee, sorted by name
      const skills = await Skill.find({
        employee_id: new Types.ObjectId(employeeId)
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


  async getMyTodos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      
      // Find todos
      const todos = await Todo.find({ 
        employee_id: new Types.ObjectId(employeeId) 
      })
      .sort({ created_at: -1 });
      
      return res.status(200).json({
        success: true,
        message: "Todos retrieved successfully",
        data: todos
      });
      
    } catch (error) {
      console.error('Error retrieving todos:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving todos",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  
  /**
   * Create a simple todo task
   */
  async createTodo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      const { title } = req.body;
      
      // Validate required field
      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Todo title is required"
        });
      }
      
      // Create todo item
      const todo = new Todo({
        employee_id: employeeId,
        title,
        completed: false,
        created_at: new Date()
      });
      
      const savedTodo = await todo.save();
      
      return res.status(201).json({
        success: true,
        message: "Todo created successfully",
        data: savedTodo
      });
      
    } catch (error) {
      console.error('Error creating todo:', error);
      return res.status(500).json({
        success: false,
        message: "Error creating todo",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  
  /**
   * Toggle todo completion status (complete/incomplete)
   */
  async toggleTodo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      const { todoId } = req.body;
      
      // Validate todoId
      if (!todoId || !Types.ObjectId.isValid(todoId)) {
        return res.status(400).json({
          success: false,
          message: "Valid todo ID is required"
        });
      }
      
      // Find the todo
      const todo = await Todo.findOne({
        _id: new Types.ObjectId(todoId),
        employee_id: new Types.ObjectId(employeeId)
      });
      
      if (!todo) {
        return res.status(404).json({
          success: false,
          message: "Todo not found"
        });
      }
      
      // Toggle completed status
      todo.completed = !todo.completed;
      await todo.save();
      
      return res.status(200).json({
        success: true,
        message: `Todo marked as ${todo.completed ? 'completed' : 'incomplete'}`,
        data: todo
      });
      
    } catch (error) {
      console.error('Error toggling todo status:', error);
      return res.status(500).json({
        success: false,
        message: "Error updating todo status",
        error: error instanceof Error ? error.message : "Unknown error"
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
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      const { todoId } = req.body;
      
      // Validate todoId
      if (!todoId || !Types.ObjectId.isValid(todoId)) {
        return res.status(400).json({
          success: false,
          message: "Valid todo ID is required"
        });
      }
      
      // Delete the todo
      const result = await Todo.findOneAndDelete({
        _id: new Types.ObjectId(todoId),
        employee_id: new Types.ObjectId(employeeId)
      });
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Todo not found"
        });
      }
      
      return res.status(200).json({
        success: true,
        message: "Todo deleted successfully"
      });
      
    } catch (error) {
      console.error('Error deleting todo:', error);
      return res.status(500).json({
        success: false,
        message: "Error deleting todo",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get employee's attendance summary analytics
   */
  async getAttendanceAnalytics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
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
  

  async getWeeklyAttendance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }
  
      const employeeId = req.user.id;
      
      // Fix the week start date calculation
      let startDate: Date;
      
      if (req.query.startDate) {
        // Convert to UTC date to avoid timezone issues
        const providedDateStr = req.query.startDate as string;
        const [year, month, day] = providedDateStr.split('-').map(n => parseInt(n));
        
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
        const todayUTC = new Date(Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        ));
        
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
          $lte: endDate
        }
      }).sort({ date: 1 });
      
      // Create a map of logs by date string for quicker access
      const logByDate = new Map();
      logs.forEach(log => {
        // Convert to YYYY-MM-DD format in UTC
        const dateObj = new Date(log.date);
        const dateString = dateObj.toISOString().split('T')[0];
        logByDate.set(dateString, log);
      });
      
      // Day names in correct order
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Format data specifically for visualization
      const dailyData = [];
      let weeklyTotal = 0;
      
      for (let i = 0; i < 7; i++) {
        // Create a new date object for each day of the week
        const currentDate = new Date(startDate);
        currentDate.setUTCDate(startDate.getUTCDate() + i);
        
        // Format as YYYY-MM-DD for consistency
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Get day of week (0-6)
        const dayOfWeek = currentDate.getUTCDay();
        const dayName = dayNames[dayOfWeek];
        
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const log = logByDate.get(dateString);
        
        console.log(`Day ${i}: ${dateString} is a ${dayName} (day ${dayOfWeek})`);
        
        let hours = 0;
        let status = 'N/A';
        
        if (log) {
          hours = log.totalHours || 0;
          status = log.status;
        }
        
        dailyData.push({
          date: dateString,
          day: dayName,
          hours: Number(hours.toFixed(2)),
          status: status,
          isWeekday
        });
        
        weeklyTotal += hours;
      }
      
      // Calculate weekly compliance
      const weekdayCount = dailyData.filter(day => day.isWeekday).length;
      const expectedHours = weekdayCount * 8;
      const compliancePercentage = expectedHours > 0 
        ? Math.min(100, Math.round((weeklyTotal / expectedHours) * 100))
        : 100;

      // Format time function
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
      
      // Format daily data with time display
      const formattedDailyData = dailyData.map(day => ({
        ...day,
        hoursDisplay: formatTime(day.hours)
      }));
      
      return res.status(200).json({
        success: true,
        message: "Weekly attendance data retrieved successfully",
        data: {
          weekRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          },
          summary: {
            totalHours: Number(weeklyTotal.toFixed(2)),
            totalHoursDisplay: formatTime(weeklyTotal),
            expectedHours,
            expectedHoursDisplay: formatTime(expectedHours),
            compliancePercentage
          },
          dailyData: formattedDailyData
        }
      });
      
    } catch (error) {
      console.error('Error retrieving weekly attendance:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving weekly attendance",
        error: error instanceof Error ? error.message : "Unknown error"
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
}



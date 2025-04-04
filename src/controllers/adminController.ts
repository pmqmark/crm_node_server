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
import AttendanceLog from "../models/logs";
import Leave, { LeaveType } from "../models/leave";
import Ticket from '../models/ticket';

async function generateEmployeeId(): Promise<string> {
  const prefix = 'QMARK';
  
  // Get the highest existing employee ID number
  const highestEmployee = await Employee.findOne({})
      .sort({ employee_id: -1 })
      .select('employee_id');
  
  let newNumber: number;
  
  if (highestEmployee && highestEmployee.employee_id) {
      // Extract the number part using regex to ensure we get only digits
      const matches = highestEmployee.employee_id.match(/\d+/);
      if (matches && matches[0]) {
          const currentNumber = parseInt(matches[0]);
          if (!isNaN(currentNumber)) {
              newNumber = currentNumber + 1;
          } else {
              newNumber = 1000; // Fallback if parsing fails
          }
      } else {
          newNumber = 1000; // Fallback if no numbers found
      }
  } else {
      // Start from 1000 if no employees exist
      newNumber = 1000;
  }
  
  // Ensure the number is at least 4 digits
  return `${prefix}${newNumber.toString().padStart(4, '0')}`;
}
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
    
        // Generate unique employee_id
        const employee_id = await generateEmployeeId();
        const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    
        const employee = new Employee({
          employee_id, // Auto-generated ID
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
    }

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

}




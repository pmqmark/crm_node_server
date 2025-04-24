import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Employee from "../models/employee";
import Department from "../models/department";
import Role from '../models/role';
import { IEmployee, User } from '../dtos/userdto';
import { EmployeeUpdateFields } from '../dtos/employeedto';
import { ClientUpdateFields } from '../dtos/userdto';
import { Client } from '../models/client';
import Ticket from '../models/ticket';
import { Project } from '../models/projects';
import Invoice from '../models/invoice';
import Admin from '../models/admin';
import { Review } from '../models/review';

export interface AuthRequest extends Request {
  user?: User;
}

interface PopulatedEmployee {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  employee_id?: string;
}

export class ClientController {
  async updateClient(req: Request, res: Response): Promise<Response> {
    try {
      const updateData: ClientUpdateFields = req.body;
      const { id } = req.body;

      // Validate if id is provided
      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: 'Valid client ID is required'
        });
      }

      // Check if client exists
      const existingClient = await Client.findById(id);

      if (!existingClient) {
        return res.status(404).json({
          message: `Client with ID ${id} not found`
        });
      }

      const updateFields: ClientUpdateFields = {};

      // Map all fields from the model
      const fields = [
        'companyName',
        'contactPerson',
        'phone',
        'address',
        'description'
      ];

      fields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      // Update the client
      const updatedClient = await Client.findByIdAndUpdate(
        id,
        { $set: updateFields },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedClient) {
        return res.status(500).json({
          message: 'Client update failed'
        });
      }

      return res.status(200).json({
        message: 'Client updated successfully',
        data: updatedClient
      });

    } catch (error) {
      return res.status(500).json({
        message: "Error updating client",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async createTicket(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
      const { title, description, priority } = req.body;

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: "Title and description are required"
        });
      }

      // Validate priority if provided
      if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Priority must be 'Low', 'Medium', or 'High'"
        });
      }

      // Create the ticket
      const ticket = new Ticket({
        client_id: clientId,
        title,
        description,
        priority: priority || 'Medium',
        status: 'Pending',
        clientResolved: false
      });

      const savedTicket = await ticket.save();

      return res.status(201).json({
        success: true,
        message: "Ticket created successfully",
        ticket: {
          id: savedTicket._id,
          ticketCode: savedTicket.ticketCode,
          title: savedTicket.title,
          description: savedTicket.description,
          priority: savedTicket.priority,
          status: savedTicket.status,
          createdAt: savedTicket.createdAt
        }
      });

    } catch (error) {
      console.error('Error creating ticket:', error);

      return res.status(500).json({
        success: false,
        message: "Error creating ticket",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getClientTickets(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
      const { status, priority, sort = 'createdAt', order = 'desc' } = req.query;

      // Build query
      const query: any = { client_id: clientId };

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

      // Determine sort order
      const sortOptions: any = {};
      sortOptions[sort as string] = order === 'asc' ? 1 : -1;

      // Find tickets
      const tickets = await Ticket.find(query)
        .sort(sortOptions)
        .populate('assignedTo', 'firstName lastName employee_id')
        .lean();

      // Prepare summary statistics
      const summary = {
        total: tickets.length,
        pending: tickets.filter(ticket => ticket.status === 'Pending').length,
        inProgress: tickets.filter(ticket => ticket.status === 'In Progress').length,
        resolved: tickets.filter(ticket => ticket.status === 'Resolved').length,
        closed: tickets.filter(ticket => ticket.status === 'Closed').length,
        highPriority: tickets.filter(ticket => ticket.priority === 'High').length
      };

      // Map tickets to ensure ticketCode is included in the response
      const formattedTickets = tickets.map(ticket => ({
        id: ticket._id,
        ticketCode: ticket.ticketCode,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        assignedTo: ticket.assignedTo,
        comments: ticket.comments
      }));

      return res.status(200).json({
        success: true,
        message: "Tickets retrieved successfully",
        summary,
        tickets: formattedTickets
      });

    } catch (error) {
      console.error('Error retrieving tickets:', error);

      return res.status(500).json({
        success: false,
        message: "Error retrieving tickets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async deleteTicket(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
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
        ticket = await Ticket.findOne({ _id: id, client_id: clientId });
      } else if (ticketCode) {
        ticket = await Ticket.findOne({ ticketCode, client_id: clientId });
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not owned by you"
        });
      }

      // Check if ticket is in a status that allows deletion
      if (ticket.status === 'In Progress' || ticket.status === 'Resolved') {
        return res.status(400).json({
          success: false,
          message: `Cannot delete ticket in ${ticket.status} status. Only tickets in 'Pending' or 'Closed' status can be deleted.`
        });
      }

      // Delete the ticket
      await Ticket.findByIdAndDelete(ticket._id);

      return res.status(200).json({
        success: true,
        message: `Ticket ${ticketCode || id} deleted successfully`
      });

    } catch (error) {
      console.error('Error deleting ticket:', error);

      return res.status(500).json({
        success: false,
        message: "Error deleting ticket",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getClientProjects(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
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

  async getClientInvoices(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
      const { status } = req.query;

      // Build query - find invoices for this client
      const query: any = { client_id: new Types.ObjectId(clientId) };

      // Add status filter if provided
      if (status) {
        if (!['Pending', 'Paid', 'Overdue'].includes(status as string)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status. Must be 'Pending', 'Paid', or 'Overdue'"
          });
        }
        query.status = status;
      }

      const invoices = await Invoice.find(query)
        .sort({ invoiceDate: -1 })
        .populate('project_id', 'projectName');

      // Calculate statistics
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
      const pendingAmount = invoices
        .filter(invoice => invoice.status === 'Pending')
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const overdueAmount = invoices
        .filter(invoice => invoice.status === 'Overdue')
        .reduce((sum, invoice) => sum + invoice.amount, 0);

      const summary = {
        total: invoices.length,
        pending: invoices.filter(invoice => invoice.status === 'Pending').length,
        paid: invoices.filter(invoice => invoice.status === 'Paid').length,
        overdue: invoices.filter(invoice => invoice.status === 'Overdue').length,
        totalAmount,
        pendingAmount,
        overdueAmount
      };

      return res.status(200).json({
        success: true,
        message: "Invoices retrieved successfully",
        summary,
        data: invoices
      });

    } catch (error) {
      console.error('Error retrieving client invoices:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving invoices",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async getClientInvoiceDetails(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
      const { invoice_id } = req.body;

      if (!invoice_id) {
        return res.status(400).json({
          success: false,
          message: "Invoice ID is required"
        });
      }

      const invoice = await Invoice.findOne({
        invoice_id,
        client_id: clientId
      })
        .populate('project_id', 'projectName');

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or not accessible by this client"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Invoice retrieved successfully",
        data: invoice
      });

    } catch (error) {
      console.error('Error retrieving invoice details:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving invoice details",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get the profile details of the currently logged-in client
   * Returns complete client profile information with related statistics
   */
  async getMyClientProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }

      const clientId = req.user.id;

      if (!Types.ObjectId.isValid(clientId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid client ID format: ${clientId}`
        });
      }

      // Get client without password
      const client = await Client.findById(clientId).select('-password');

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client profile not found"
        });
      }

      // Get related statistics using TypeScript-safe approach
      const projectCount = await Project.countDocuments({ client: new Types.ObjectId(clientId) });

      const ticketCount = await Ticket.countDocuments({ client_id: new Types.ObjectId(clientId) });

      const invoiceCount = await Invoice.countDocuments({ client_id: new Types.ObjectId(clientId) });

      const activeProjectCount = await Project.countDocuments({
        client: new Types.ObjectId(clientId),
        status: 'In Progress'
      });

      const pendingInvoiceAmount = await Invoice.aggregate([
        {
          $match: {
            client_id: new Types.ObjectId(clientId),
            status: 'Pending'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Format the response
      const profileData = {
        id: client._id,
        companyName: client.companyName,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone,
        address: client.address,
        description: client.description,
        createdAt: client.createdAt,
        lastLogin: client.lastLogin,
        stats: {
          projectCount,
          activeProjectCount,
          ticketCount,
          invoiceCount,
          pendingAmount: pendingInvoiceAmount.length > 0 ? pendingInvoiceAmount[0].total : 0
        }
      };

      return res.status(200).json({
        success: true,
        message: "Client profile retrieved successfully",
        data: profileData
      });

    } catch (error) {
      console.error('Error retrieving client profile:', error);
      return res.status(500).json({
        success: false,
        message: "Error retrieving client profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async addTicketComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
      const { ticketId, comment } = req.body;

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required"
        });
      }

      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message: "Comment text is required"
        });
      }

      // Find the ticket and ensure it belongs to the client
      const ticket = await Ticket.findOne({
        _id: new Types.ObjectId(ticketId),
        client_id: new Types.ObjectId(clientId)
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not owned by you"
        });
      }

      // Get client details to include with comment
      const client = await Client.findById(clientId)
        .select('companyName contactPerson');

      if (!client) {
        return res.status(500).json({
          success: false,
          message: "Client details not found"
        });
      }

      // Add comment
      ticket.comments = ticket.comments || [];
      const newComment = {
        text: comment,
        createdBy: new Types.ObjectId(clientId),
        createdAt: new Date()
      };

      ticket.comments.push(newComment);
      await ticket.save();

      // MongoDB automatically assigns _id to the subdocument
      // Access the newly added comment
      const addedComment = ticket.comments[ticket.comments.length - 1];

      return res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: {
          commentId: addedComment._id,
          text: comment,
          createdAt: newComment.createdAt,
          authorName: client.contactPerson || client.companyName,
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

  /**
   * Get ticket details with all comments for the client
   */
  async getTicketDetails(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
      const { ticketId, ticketCode } = req.body;

      // Check if we have at least one identifier
      if ((!ticketId || !Types.ObjectId.isValid(ticketId)) && !ticketCode) {
        return res.status(400).json({
          success: false,
          message: "Either valid ticket ID or ticket code is required"
        });
      }

      // Find ticket using ID or code
      let ticket;
      if (ticketId && Types.ObjectId.isValid(ticketId)) {
        ticket = await Ticket.findOne({
          _id: new Types.ObjectId(ticketId),
          client_id: new Types.ObjectId(clientId)
        }).populate<{ assignedTo: PopulatedEmployee | null }>('assignedTo', 'firstName lastName');
      } else if (ticketCode) {
        ticket = await Ticket.findOne({
          ticketCode,
          client_id: new Types.ObjectId(clientId)
        }).populate<{ assignedTo: PopulatedEmployee | null }>('assignedTo', 'firstName lastName');
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not owned by you"
        });
      }

      // Get all comment author details
      const commentUserIds = ticket.comments?.map(comment => comment.createdBy) || [];

      // Get admin, employee, and client details for comment authors
      const [employees, clients, admins] = await Promise.all([
        Employee.find({ _id: { $in: commentUserIds } })
          .select('_id firstName lastName'),
        Client.find({ _id: { $in: commentUserIds } })
          .select('_id companyName contactPerson'),
        Admin.find({ _id: { $in: commentUserIds } })
          .select('_id')
      ]);

      // Create maps for quick lookup
      const employeeMap = new Map(
        employees.map(emp => [emp._id.toString(), `${emp.firstName} ${emp.lastName}`])
      );

      const clientMap = new Map(
        clients.map(client => [
          client._id.toString(),
          client.contactPerson || client.companyName
        ])
      );

      const adminMap = new Map(
        admins.map(admin => [admin._id.toString(), "Admin"])
      );

      // Format comments with author names
      const formattedComments = (ticket.comments || []).map(comment => {
        const userId = comment.createdBy.toString();
        let authorName = 'Unknown User';

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
          authorName
        };
      });

      // Sort comments by newest first
      formattedComments.sort((a, b) =>
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
          clientResolved: ticket.clientResolved || false,
          clientResolvedAt: ticket.clientResolvedAt,
          createdAt: ticket.createdAt,
          assignedTo: ticket.assignedTo ? {
            name: `${(ticket.assignedTo as PopulatedEmployee).firstName} ${(ticket.assignedTo as PopulatedEmployee).lastName}`
          } : null,
          comments: formattedComments,
          commentCount: formattedComments.length
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

  /**
   * Toggle the client-side resolution status of a ticket
   * This doesn't change the official ticket status - just indicates if client considers it resolved
   */
  async toggleTicketResolution(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const clientId = req.user.id;
      const { ticketId, resolved } = req.body;

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required"
        });
      }

      // Make sure the resolved parameter is provided and is a boolean
      if (typeof resolved !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "'resolved' parameter must be a boolean value"
        });
      }

      // Find the ticket and ensure it belongs to the client
      const ticket = await Ticket.findOne({
        _id: new Types.ObjectId(ticketId),
        client_id: new Types.ObjectId(clientId)
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not owned by you"
        });
      }

      // Update the client resolution status
      ticket.clientResolved = resolved;

      // If marking as resolved, set the timestamp
      if (resolved) {
        ticket.clientResolvedAt = new Date();

        // Optionally add a comment indicating the client marked it as resolved
        ticket.comments = ticket.comments || [];
        ticket.comments.push({
          text: "Client marked this ticket as resolved",
          createdBy: new Types.ObjectId(clientId),
          createdAt: new Date()
        });
      } else {
        // If unmarking as resolved, remove the timestamp
        ticket.clientResolvedAt = undefined;

        // Optionally add a comment indicating the client unmarked it as resolved
        ticket.comments = ticket.comments || [];
        ticket.comments.push({
          text: "Client unmarked this ticket as resolved",
          createdBy: new Types.ObjectId(clientId),
          createdAt: new Date()
        });
      }

      await ticket.save();

      return res.status(200).json({
        success: true,
        message: `Ticket marked as ${resolved ? 'resolved' : 'unresolved'} by client`,
        data: {
          id: ticket._id,
          ticketCode: ticket.ticketCode,
          title: ticket.title,
          status: ticket.status, // Official status remains unchanged
          clientResolved: ticket.clientResolved,
          clientResolvedAt: ticket.clientResolvedAt
        }
      });

    } catch (error) {
      console.error('Error toggling ticket resolution:', error);
      return res.status(500).json({
        success: false,
        message: "Error updating ticket resolution status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get ticket timeline for client
   * Shows key events in chronological order
   * Only accessible for tickets created by the client
   */
  async getTicketTimeline(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing"
        });
      }

      const clientId = req.user.id;
      const { ticketId } = req.body;

      if (!ticketId || !Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          message: "Valid ticket ID is required"
        });
      }

      // Define interfaces for the populated fields
      interface PopulatedEmployee {
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
      }

      // Find ticket owned by this client
      const ticket = await Ticket.findOne({
        _id: new Types.ObjectId(ticketId),
        client_id: new Types.ObjectId(clientId)
      })
        .populate<{ assignedTo: PopulatedEmployee }>('assignedTo', 'firstName lastName')
        .select('ticketCode title status priority createdAt clientResolved clientResolvedAt comments updatedAt')
        .lean();

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found or not owned by you"
        });
      }

      // Define all timeline event data types
      interface CreationEventData {
        ticketCode: string;
        title: string;
        priority: 'Low' | 'Medium' | 'High';
      }

      interface AssignmentEventData {
        assignee: {
          name: string;
        };
      }

      interface ResolutionEventData {
        resolvedByClient: boolean;
      }

      interface StatusEventData {
        status: string;
      }

      interface CommentEventData {
        totalComments: number;
        latestComment: {
          text: string;
          date: Date;
          author: string;
        } | null;
      }

      // Union type for all timeline event types
      type TimelineEvent =
        | { type: 'creation'; title: string; date: Date; data: CreationEventData }
        | { type: 'assignment'; title: string; date: Date; data: AssignmentEventData }
        | { type: 'client_resolution'; title: string; date: Date; data: ResolutionEventData }
        | { type: 'resolution'; title: string; date: Date; data: StatusEventData }
        | { type: 'comments'; title: string; date: Date; data: CommentEventData };

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
          priority: ticket.priority
        }
      });

      // 2. Add assignment event if available
      if (ticket.assignedTo) {
        timeline.push({
          type: 'assignment',
          title: 'Support Agent Assigned',
          date: ticket.createdAt, // Using creation date as assignment date
          data: {
            assignee: {
              name: `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
            }
          }
        });
      }

      // 3. Add client resolution event if the client marked it resolved
      if (ticket.clientResolved && ticket.clientResolvedAt) {
        timeline.push({
          type: 'client_resolution',
          title: 'You Marked as Resolved',
          date: ticket.clientResolvedAt,
          data: {
            resolvedByClient: true
          }
        });
      }

      // 4. Add status resolution event if applicable
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        timeline.push({
          type: 'resolution',
          title: `Ticket ${ticket.status}`,
          date: ticket.updatedAt || ticket.createdAt,
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
      let latestCommentAuthor: string | null = null;
      if (latestComment) {
        const authorId = latestComment.createdBy.toString();

        // Check if the author is the current client
        if (authorId === clientId.toString()) {
          latestCommentAuthor = "You";
        } else {
          // Find author from appropriate collection
          const [admin, employee, client] = await Promise.all([
            Admin.findById(authorId).select('_id').lean(),
            Employee.findById(authorId).select('firstName lastName').lean(),
            Client.findById(authorId).select('companyName contactPerson').lean()
          ]);

          if (admin) latestCommentAuthor = 'Admin';
          else if (employee && 'firstName' in employee && 'lastName' in employee) {
            latestCommentAuthor = `${employee.firstName} ${employee.lastName}`;
          }
          else if (client && ('companyName' in client || 'contactPerson' in client)) {
            latestCommentAuthor = client.contactPerson || client.companyName || 'Client';
          }
        }
      }

      // Add comment activity summary to timeline
      if (totalComments > 0) {
        timeline.push({
          type: 'comments',
          title: 'Comment Activity',
          date: latestComment?.createdAt || ticket.createdAt,
          data: {
            totalComments,
            latestComment: latestComment ? {
              text: latestComment.text?.substring(0, 50) + (latestComment.text?.length > 50 ? '...' : ''),
              date: latestComment.createdAt,
              author: latestCommentAuthor || 'Unknown'
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


  async createReview(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const userId = req.user.id;
      const { rating, comment } = req.body;

      // Validate required fields
      if (!rating && !comment) {
        return res.status(400).json({
          success: false,
          message: "Rating or comment is required"
        });
      }

      // Create the review
      const review = new Review({
        user_id: userId,
        rating,
        comment,
      });

      const savedReview = await review.save();

      return res.status(201).json({
        success: true,
        message: "Review created successfully",
        review: {
          id: savedReview._id,
          user_id: savedReview.user_id,
          rating: savedReview.rating,
          comment: savedReview.comment,
          createdAt: savedReview.createdAt,
        }
      });

    } catch (error) {
      console.error('Error creating review:', error);

      return res.status(500).json({
        success: false,
        message: "Error creating review",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async getClientReviews(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const user_id = req.user.id;
      const { sort = 'createdAt', order = 'desc' } = req.query;

      // Build query
      const query: any = { user_id: user_id };

      // Determine sort order
      const sortOptions: any = {};
      sortOptions[sort as string] = order === 'asc' ? 1 : -1;

      // Find reviews
      const reviews = await Review.find(query)
        .sort(sortOptions)
        .populate('user_id', 'contactPerson')
        .lean();

      // Map reviews to ensure reviewCode is included in the response
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
        message: "Reviews retrieved successfully",
        data: formattedReviews
      });

    } catch (error) {
      console.error('Error retrieving reviews:', error);

      return res.status(500).json({
        success: false,
        message: "Error retrieving reviews",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }


  async deleteReview(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const user_id = req.user.id;
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Review ID is required"
        });
      }

      // Find review
      let review;
      if (id && Types.ObjectId.isValid(id)) {
        review = await Review.findOne({ _id: id, user_id: user_id });
      }

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found or not owned by you"
        });
      }

      // Delete the review
      await Review.findByIdAndDelete(review._id);

      return res.status(200).json({
        success: true,
        message: `Review ${id} deleted successfully`
      });

    } catch (error) {
      console.error('Error deleting review:', error);

      return res.status(500).json({
        success: false,
        message: "Error deleting review",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

}
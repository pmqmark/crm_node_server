
import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Employee from "../models/employee";
import Department from "../models/department";
import Role from '../models/role';
import { IEmployee, User } from '../dtos/userdto';
import { EmployeeUpdateFields } from '../dtos/employeedto';


export interface AuthRequest extends Request {
  user?: User;
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


  async findEmployee(req: AuthRequest, res: Response): Promise<Response> {
    try {
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "Unauthorized: User ID is missing"
        });
      }
  
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
  

}
    


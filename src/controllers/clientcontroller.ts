
import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Employee from "../models/employee";
import Department from "../models/department";
import Role from '../models/role';
import { IEmployee, User } from '../dtos/userdto';
import { EmployeeUpdateFields } from '../dtos/employeedto';
import { ClientUpdateFields } from '../dtos/userdto';
import {Client} from '../models/client';
export interface AuthRequest extends Request {
  user?: User;
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

}
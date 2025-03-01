import { Request, Response } from 'express';
import mongoose, { Schema, Types } from 'mongoose';
import Employee from "../models/employee";
import Department from "../models/department";
import { IDepartment } from '../dtos/departmentdto';

interface DepartmentUpdateFields {
  name?: string;
  description?: string;
  manager_id?: Types.ObjectId;
  permissions?: Types.ObjectId[];
}

export class DepartmentController {
  async updateDepartment(req: Request, res: Response): Promise<Response> {
    try {
      const updateData: IDepartment = req.body;

      if (!updateData.id) {
        throw new Error('id has to be provided');
      }

      const existingDepartment = await Department.findById(updateData.id);
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
      if (updateData.permissions !== undefined) {
        // Convert string[] permissions to ObjectId[]
        updateFields.permissions = Array.isArray(updateData.permissions)
          ? updateData.permissions.map((permId: string) => new Types.ObjectId(permId))
          : updateData.permissions;
      }

      // If manager_id is provided — update manager accordingly
      if (updateData.manager_id !== undefined) {
        if (!Types.ObjectId.isValid(updateData.manager_id)) {
          throw new Error(`Invalid manager_id format: ${updateData.manager_id}`);
        }
        const newManager = await Employee.findById(updateData.manager_id);
        if (!newManager) {
          throw new Error(`Employee with ID ${updateData.manager_id} not found`);
        }
        updateFields.manager_id = new Types.ObjectId(updateData.manager_id);

        // Clear permissions for the previous manager if one exists
        if (existingDepartment.manager_id) {
          await Employee.findByIdAndUpdate(
            existingDepartment.manager_id,
            { $set: { permissions: [] } }
          );
        }

        // Update new manager's permissions with the department's permissions
        await Employee.findByIdAndUpdate(
          updateData.manager_id,
          { $set: { permissions: updateFields.permissions || existingDepartment.permissions } }
        );
      }
      // If only permissions are updated and a manager exists, update that manager’s permissions
      else if (updateData.permissions && existingDepartment.manager_id) {
        await Employee.findByIdAndUpdate(
          existingDepartment.manager_id,
          { $set: { permissions: updateFields.permissions } }
        );
      }

      const updatedDepartment = await Department.findByIdAndUpdate(
        updateData.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updatedDepartment) {
        return res.status(500).json({ message: 'Department update failed' });
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
}
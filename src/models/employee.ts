import mongoose, { Schema, Document } from 'mongoose';
import {IUser,IAdmin,IEmployee} from "../dtos/userdto"
import User from './user'

  const employeeSchema = new Schema<IEmployee>({
    employee_id: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    department_id: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
    },
    role_id: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: false,
    },
    hireDate: {
      type: Date,
      required: true,
    },
    dob:{
      type: Date,
      required: true,
    },
    addressline1: {
      type: String,
      required: true,
    },
    addressline2: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
    },
    postalcode: {
      type: String,
      required: true,
    },
    employeebio: {
      type: String,
      required: true,
    }

  });

  const Employee = User.discriminator<IEmployee>('Employee', employeeSchema);

  export default Employee;
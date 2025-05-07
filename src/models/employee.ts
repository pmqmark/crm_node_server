import mongoose, { Schema, Document } from 'mongoose';
import {IUser, IAdmin, IEmployee} from "../dtos/userdto"
import User from './user'

// Counter schema for employee IDs
const EmployeeCounterSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    default: 'employeeId'
  },
  value: { 
    type: Number, 
    required: true,
    default: 1199  // Setting to 1199 so first increment gives 1200
  }
});

// Create the counter model if it doesn't exist
const EmployeeCounter = mongoose.models.EmployeeCounter || 
  mongoose.model('EmployeeCounter', EmployeeCounterSchema, 'employeecounters');

const employeeSchema = new Schema<IEmployee>({
  employee_id: {
    type: String,
    required: false,
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
  },
  status: {
    type: String,
    enum: ['Full-Time', 'Contract', 'Probation', 'WFH'],
    default: 'Probation',
    required: true
},
leaveRef: {
  type: Schema.Types.ObjectId,
  ref: 'LeaveForEmp',
  default: new mongoose.Types.ObjectId('681a69cae6138be704aa52d9'),
  required: true
}
});

// Pre-save middleware to generate employee_id
employeeSchema.pre('save', async function(this: IEmployee & Document, next) {
  try {
    if (this.isNew && !this.employee_id) {
      let isUnique = false;
      let employeeId = '';
      let attempts = 0;
      const maxAttempts = 10; // Prevent infinite loops
      
      // Try to generate a unique ID
      while (!isUnique && attempts < maxAttempts) {
        // Get counter or create it if it doesn't exist
        const counter = await EmployeeCounter.findOneAndUpdate(
          { name: 'employeeId' },
          { $inc: { value: 1 } },
          { 
            new: true, 
            upsert: true,
            setDefaultsOnInsert: true
          }
        );
        
        if (!counter) {
          throw new Error('Failed to generate employee ID');
        }
        
        employeeId = `QMARK${counter.value}`;
        
        // Check if this ID already exists
        const existingEmployee = await mongoose.model('Employee').findOne({ 
          employee_id: employeeId 
        });
        
        if (!existingEmployee) {
          // We found a unique ID
          isUnique = true;
          this.employee_id = employeeId;
        } else {
          // ID already exists, try again
          attempts++;
        }
      }
      
      if (!isUnique) {
        throw new Error(`Could not generate a unique employee ID after ${maxAttempts} attempts`);
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create a unique index on employee_id
employeeSchema.index({ employee_id: 1 }, { unique: true });

const Employee = User.discriminator<IEmployee>('Employee', employeeSchema);

export default Employee;
import mongoose, { Schema } from "mongoose";
import { IRole } from "../dtos/roledto";

const roleSchema = new Schema<IRole>({
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    permissions: [{
      type: String
    }],
    
  });
  
 


const Role = mongoose.model<IRole>('Role', roleSchema);
export default Role;
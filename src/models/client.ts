import { Schema, model } from "mongoose";
import User from "./user";
import { IUser, IAdmin, IClient, IEmployee } from "../dtos/userdto";

const clientSchema = new Schema<IClient>({
  companyName: {
    type: String,
    required: true,
  },
  contactPerson: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
});

const Client = User.discriminator<IClient>("Client", clientSchema);

export { Client, IClient };

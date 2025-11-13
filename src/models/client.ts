import { Schema, model } from "mongoose";
import User from "./user";
import { IUser, IAdmin, IClient, IEmployee } from "../dtos/userdto";

const clientSchema = new Schema<IClient>({
  companyName: {
    type: String,
    // required: true,since no need of company name
    default: "Confidential",
  },
  contactPerson: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: true,
  },
});

const Client = User.discriminator<IClient>("Client", clientSchema);

export { Client, IClient };

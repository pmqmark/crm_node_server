import { CreateClientDto } from '../dtos/client.dto';
import { ClientModel } from '../models/client.model';
import { IClient } from '../models/interfaces/client.interface';
const bcrypt = require('bcrypt');

export class ClientService {
  async createClient(clientData: CreateClientDto): Promise<IClient> {
    try {
      // Hash password if provided
      if (clientData.password) {
        clientData.password = await bcrypt.hash(clientData.password, 10);
      }

      // Create client in database
      const client = new ClientModel(clientData);
      return await client.save();
    } catch (error) {
      throw new Error('Error creating client');
    }
  }

  async getClients(): Promise<IClient[]> {
    try {
      return await ClientModel.find();
    } catch (error) {
      throw new Error('Error fetching clients');
    }
  }

  async getClientById(id: string): Promise<IClient | null> {
    try {
      return await ClientModel.findById(id);
    } catch (error) {
      throw new Error('Error fetching client');
    }
  }

  async updateClient(id: string, updateData: Partial<CreateClientDto>): Promise<IClient | null> {
    try {
      // Hash password if it's being updated
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      return await ClientModel.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      throw new Error('Error updating client');
    }
  }

  async deleteClient(id: string): Promise<void> {
    try {
      await ClientModel.findByIdAndDelete(id);
    } catch (error) {
      throw new Error('Error deleting client');
    }
  }
}

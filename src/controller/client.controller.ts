import { Request, Response } from 'express';
import { ClientService } from '../services/client.services';
import { CreateClientDto } from '../dtos/client.dto';

export class ClientController {
  private clientService: ClientService;

  constructor() {
    this.clientService = new ClientService();
  }

  async createClient(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const clientData: CreateClientDto = req.body;
      console.log(clientData);
      
      // Pass data to service layer
      const client = await this.clientService.createClient(clientData);
      
      // Send response back
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create client' });
    }
  }

  async getClients(req: Request, res: Response): Promise<void> {
    try {
      const clients = await this.clientService.getClients();
      res.status(200).json(clients);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  }

  async getClientById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const client = await this.clientService.getClientById(id);
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      res.status(200).json(client);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  }

  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updatedClient = await this.clientService.updateClient(id, req.body);
      res.status(200).json(updatedClient);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update client' });
    }
  }

  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.clientService.deleteClient(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete client' });
    }
  }
}
import { Router } from "express";
import { roleGuard } from '../middleware/roleguard';
import { authMiddleware } from '../middleware/verifyToken';
import { ClientController } from "../controllers/clientcontroller";

const router = Router();
const clientController = new ClientController();

router.use(authMiddleware);
router.use(roleGuard(["Client"]));

// Client profile update route
router.put('/update', (req, res) => {
  clientController.updateClient(req, res);
});

// Ticket management routes
router.post('/create-ticket', (req, res) => {
  clientController.createTicket(req, res);
});

router.get('/tickets', (req, res) => {
  clientController.getClientTickets(req, res);
});

router.delete('/delete-ticket', (req, res) => {
  clientController.deleteTicket(req, res);
});

router.get('/projects', (req, res) => {
  clientController.getClientProjects(req, res);
});

// Client Invoice Routes
router.get('/invoices', authMiddleware, (req, res) => {
  clientController.getClientInvoices(req, res);
});

router.post('/invoice-details', authMiddleware, (req, res) => {
  clientController.getClientInvoiceDetails(req, res);
});

export default router;
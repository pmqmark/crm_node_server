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

router.post('/ticket-comment', authMiddleware, (req, res) => {
  clientController.addTicketComment(req, res);
});

router.post('/ticket-details', (req, res) => {
  clientController.getTicketDetails(req, res);
});
router.post('/toggle-ticket-resolution', authMiddleware, (req, res) => {
  clientController.toggleTicketResolution(req, res);
});

router.post('/ticket-timeline', (req, res) => {
  clientController.getTicketTimeline(req, res);
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

router.get("/my-profile", authMiddleware, (req, res) => {
  clientController.getMyClientProfile(req, res);
});

export default router;
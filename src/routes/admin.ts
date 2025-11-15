import { Router } from "express";
import { roleGuard } from "../middleware/roleguard";
import { authMiddleware } from "../middleware/verifyToken";
import { AdminController } from "../controllers/adminController";
import { DepartmentController } from "../controllers/departmentcontroller";
import { EmployeeController } from "../controllers/employeecontroller";
import { ClientController } from "../controllers/clientcontroller";
const router = Router();
const adminController = new AdminController();
const departmentcontroller = new DepartmentController();
const employeeController = new EmployeeController();
const clientController = new ClientController();
router.use(authMiddleware); //authMiddleware is the jwtMiddleware that verifies token
router.use(roleGuard(["Admin"])); //role based protected routes
router.post("/createadmin", (req, res, next) => {
  adminController.createAdmin(req, res);
});
router.get("/test", (req, res) => {
  res.status(200).send("Everything is working fine!");
});

router.post("/createemployee", (req, res, next) => {
  adminController.createEmployee(req, res);
});

router.post("/createdepartment", (req, res, next) => {
  adminController.createDepartment(req, res);
});

router.put("/updatedepartment", (req, res, next) => {
  departmentcontroller.updateDepartment(req, res);
});

router.delete("/deletedepartment", (req, res, next) => {
  adminController.deleteDepartment(req, res);
});
router.get("/getdepartments", (req, res, next) => {
  departmentcontroller.listDepartments(req, res);
});
router.get("/findallemployee", (req, res, next) => {
  employeeController.listEmployees(req, res);
});

router.put("/updateemp", (req, res) => {
  employeeController.updateEmployee(req, res);
});

router.get("/search", (req, res, next) => {
  employeeController.searchEmployee(req, res);
});

router.delete("/deleteemployee", (req, res, next) => {
  employeeController.deleteEmployee(req, res);
});

router.post("/createclient", (req, res, next) => {
  adminController.createClient(req, res);
});

router.put("/updateclient", (req, res, next) => {
  clientController.updateClient(req, res);
});

router.post("/add-project", (req, res, next) => {
  departmentcontroller.createProject(req, res);
});

router.get("/list-clients", (req, res, next) => {
  adminController.listClients(req, res);
});

router.post("/create-role", (req, res, next) => {
  adminController.createRoles(req, res);
});

router.delete("/delete-role/:role_id", (req, res) => {
  adminController.deleteRole(req, res);
});

router.get("/list-role", (req, res, next) => {
  adminController.listRoles(req, res);
});

router.get("/list-project", (req, res, next) => {
  adminController.listProjects(req, res);
});

router.get("/get-attendence", (req, res, next) => {
  adminController.getAttendanceLogs(req, res);
});

router.get("/leaves", (req, res, next) => {
  adminController.getAllLeaves(req, res);
});

router.post("/update-leave", (req, res, next) => {
  adminController.updateLeaveStatus(req, res);
});

router.get("/tickets", (req, res) => {
  adminController.getTickets(req, res);
});

router.put("/update-ticket", (req, res) => {
  adminController.updateTicket(req, res);
});

router.delete("/delete-ticket", (req, res) => {
  adminController.deleteTicket(req, res);
});

router.post("/ticket-details", (req, res) => {
  adminController.getTicketDetails(req, res);
});

router.post("/ticket-comment", authMiddleware, (req, res) => {
  adminController.addTicketComment(req, res);
});

router.post("/ticket-timeline", (req, res) => {
  adminController.getTicketTimeline(req, res);
});

// Invoice routes
router.post("/create-invoice", (req, res) => {
  adminController.createInvoice(req, res);
});

router.post("/get-invoice", (req, res) => {
  adminController.getInvoice(req, res);
});

router.get("/list-invoices", (req, res) => {
  adminController.listInvoices(req, res);
});

router.put("/update-invoice", (req, res) => {
  adminController.updateInvoice(req, res);
});

router.delete("/delete-invoice", (req, res) => {
  adminController.deleteInvoice(req, res);
});

router.get("/get-employee-statis", (req, res) => {
  adminController.getEmployeeStatusCount(req, res);
});

router.get("/attendance/daily", (req, res) => {
  adminController.getDailyAttendance(req, res);
});

router.get("/attendance/weekly", (req, res) => {
  adminController.getWeeklyAttendance(req, res);
});

router.get("/attendance/monthly", (req, res) => {
  adminController.getMonthlyAttendance(req, res);
});

// router.get('/get-log',(req,res)=>{
//     adminController.getDatabaseLogs(req,res)
// })

router.post("/create-schedule", (req, res) => {
  adminController.createSchedule(req, res);
});

router.get("/get-task-stat", (req, res) => {
  adminController.getTaskStatistics(req, res);
});

router.get("/get-schedule", (req, res) => {
  adminController.listSchedules(req, res);
});

router.get("/total-project", (req, res) => {
  adminController.getProjectCount(req, res);
});

router.get("/total-client", (req, res) => {
  adminController.getClientCount(req, res);
});

router.get("/project-details-teams", (req, rees) => {
  adminController.getProjectDetails(req, rees);
});

router.post("/update-project", (req, res) => {
  adminController.updateProject(req, res);
});

router.delete("/delete-project/:project_id", (req, res) => {
  adminController.deleteProject(req, res);
});

router.delete("/delete-client/:client_id", (req, res) => {
  adminController.deleteClient(req, res);
});

router.post("/update-role/:role_id", (req, res) => {
  adminController.updateRole(req, res);
});

router.post("/add-task", (req, res) => {
  adminController.assignTask(req, res);
});

// update task 
router.patch("/edit-task", (req, res) => {
  adminController.editTask(req, res);
});


router.post("/get-project-tasks-stats", (req, res) => {
  adminController.getProjectTaskStatistics(req, res);
});

router.get("/tasks/:project_id", (req, res) => {
  adminController.getTasksByProjectId(req, res);
});

router.post("/get-project-tasks", (req, res) => {
  adminController.getProjectTasks(req, res);
});

router.post("/get-teams", (req, res) => {
  adminController.getProjectDetails(req, res);
});

router.post("/add-project-manager", (req, res) => {
  adminController.addProjectManager(req, res);
});

router.post("/add-team-leader", (req, res) => {
  adminController.addTeamLeader(req, res);
});

router.post("/add-team-member", (req, res) => {
  adminController.addTeamMember(req, res);
});

router.post("/get-activity", (req, res) => {
  adminController.getLatestCompletedTasks(req, res);
});

router.post("/create-detailed-invoice", (req, res) => {
  adminController.createInvoice1(req, res);
});

router.put("/invoice/:id", (req, res) => {
  adminController.updateInvoice1(req, res);
});

router.get("/invoice/:id", (req, res) => {
  adminController.listAllInvoices(req, res);
});

// router.delete('/invoice/:id', (req, res) => {
//     adminController.deleteInvoice1(req, res);
// });

router.get("/projects/clients/:id", (req, res) => {
  adminController.getClientProjects(req, res);
});

router.get("/reviews", (req, res) => {
  adminController.getReviews(req, res);
});

router.delete("/reviews", (req, res) => {
  adminController.deleteReview(req, res);
});

router.get("/employee-skills/:id", (req, res) => {
  adminController.getEmployeeSkills(req, res);
});

router.get("/employee-attendance-analytics/:id", authMiddleware, (req, res) => {
  adminController.getEmpAttendanceAnalytics(req, res);
});

router.get("/attendance/periodicaly", (req, res) => {
  adminController.getPeriodicAttendance(req, res);
});

router.get("/fetch-task-statistics", (req, res) => {
  adminController.getTaskStatistics(req, res);
});

router.get("/employee-chart", (req, res) => {
  adminController.getEmployeeChart(req, res);
});

router.post("/create-policy", (req, res) => {
  adminController.createPolicy(req, res);
});

router.put("/update-policy", (req, res) => {
  adminController.updatePolicy(req, res);
});

router.get("/get-policy", (req, res) => {
  adminController.getPolicy(req, res);
});

router.post("/create-leave-policy", (req, res) => {
  adminController.createLeaveForEmp(req, res);
});

router.get("/get-leaves", (req, res) => {
  adminController.getLeavepolicyForEmp(req, res);
});

router.put("/update-defleave", (req, res) => {
  adminController.updateDefaultLeave(req, res);
});

router.get("/leave/:id", (req, res) => {
  adminController.getLeaveById(req, res);
});

router.put("/update-leave-policy/:id", (req, res) => {
  adminController.updateLeaveById(req, res);
});

router.post("/cretate-projectview", (req, res) => {
  adminController.createProjectDisplay(req, res);
});

router.get("/project-display/:project_id", (req, res) => {
  adminController.getProjectDisplayById(req, res);
});

router.get("/todos", authMiddleware, (req, res) => {
  adminController.getTodos(req, res);
});

router.post("/todos", authMiddleware, (req, res) => {
  adminController.createTodo(req, res);
});

router.patch("/todos/toggle", authMiddleware, (req, res) => {
  adminController.toggleTodo(req, res);
});

router.delete("/todos", authMiddleware, (req, res) => {
  adminController.deleteTodo(req, res);
});

router.put("/todos/:todoId", authMiddleware, (req, res) => {
  adminController.editTodo(req, res);
});

export default router;

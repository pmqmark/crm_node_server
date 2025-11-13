# CRM Backend Workflows

_Date: 2025-11-10_

This document consolidates all major operational workflows implemented in the CRM Node Server backend. Each section explains the sequence of API calls, middleware checks, database interactions, and resulting state transitions.

## 1. Request Processing Pipeline

1. **Client Request** – A frontend or API consumer issues an HTTP request to an `/api/*` endpoint.
2. **Route Resolution** – Express matches the URL to the appropriate router module under `src/routes/`.
3. **Global Middleware** – `cors`, `cookie-parser`, JSON and URL-encoded body parsers run for every request.
4. **Authentication (`authMiddleware`)** – Extracts the Bearer token, verifies the signature, and attaches the decoded payload to `req.user`. Missing or invalid tokens produce a `401` response.
5. **Authorization (`roleGuard`)** – Confirms the authenticated user has one of the allowed roles before reaching the route handler. Failing this check returns `403`.
6. **Controller Execution** – The assigned controller method performs business logic (validation, database queries, aggregations, side effects).
7. **Persistence Layer** – Mongoose models interact with MongoDB; schema hooks handle derived values (ID generation, timestamps, status calculations).
8. **Response Delivery** – The controller sends a JSON payload or propagates an error that Express returns as an HTTP response.

## 2. Authentication & Session Management

1. **Login**
   - Endpoint: `POST /api/auth/login`
   - Validates user credentials with bcrypt.
   - Issues access token (24h) and refresh token (7d) containing `id`, `email`, and `role`.
2. **Accessing Protected Routes**
   - Client includes `Authorization: Bearer <access token>` header.
   - `authMiddleware` and `roleGuard` enforce identity and permissions.
3. **Token Renewal**
   - Endpoint: `POST /api/auth/regenerate-tokens`
   - Verifies refresh token, issues new access and refresh tokens.
4. **Admin Provisioning**
   - Endpoint: `POST /api/auth/create-admin`
   - Seeds admin accounts with hashed passwords.

## 3. Admin Workflows

### 3.1 Employee Onboarding

1. Admin logs in and obtains tokens.
2. Submits new employee details to `POST /api/admin/createemployee`.
3. Middleware sequence validates admin role.
4. Controller hashes password, validates department/role references, and saves the employee.
5. `Employee` model pre-save hook auto-generates a unique `QMARK####` ID.
6. Response returns employee profile data for frontend confirmation.

### 3.2 Department & Role Management

1. Admin creates departments via `POST /api/admin/createdepartment` and assigns managers with `PUT /api/admin/updatedepartment`.
2. Roles and permissions managed through `POST /api/admin/create-role` and `POST /api/admin/update-role/:role_id`.
3. Controllers ensure referenced employees exist before linking.

### 3.3 Project Lifecycle

1. Create project with `POST /api/admin/add-project` (validated client, dates, status, tags).
2. Assign managers, team leads, and members using dedicated endpoints (`add-project-manager`, `add-team-leader`, `add-team-member`).
3. Update or delete projects through `POST /api/admin/update-project` and `DELETE /api/admin/delete-project/:project_id`.
4. Mongoose hooks enforce unique project display records (`ProjectDisplay`).
5. Analytics endpoints (`/get-project-tasks-stats`, `/get-task-stat`, `/list-project`) aggregate progress data for dashboards.

### 3.4 Task Assignment & Tracking

1. Admin assigns tasks via `POST /api/admin/add-task` (links to projects and employees).
2. Task statistics retrieved through `/fetch-task-statistics`, `/get-project-tasks`, and `/get-project-tasks-stats`.
3. Task documents maintain status, due dates, and assigned employees; indexes optimize status-based queries.

### 3.5 Attendance Oversight

1. Admin fetches attendance summaries via `/attendance/daily`, `/attendance/weekly`, `/attendance/monthly`.
2. Detailed logs obtained through `/get-attendence`.
3. Controllers aggregate `AttendanceLog` documents to compute totals and percentages for dashboards.

### 3.6 Leave Administration

1. View leave requests using `GET /api/admin/leaves`.
2. Approve/reject via `POST /api/admin/update-leave` (updates status and optional comments).
3. Configure leave policies:
   - Create policy templates (`/create-leave-policy`), update defaults (`/update-defleave`), and manage specific policies by ID.
4. `LeaveForEmp` pre-save hook ensures only one default policy exists and validates holiday data.

### 3.7 Ticket Moderation

1. List tickets with `GET /api/admin/tickets`.
2. Update status or assignment via `PUT /api/admin/update-ticket`.
3. Remove resolved tickets using `DELETE /api/admin/delete-ticket`.
4. Add comments (`POST /api/admin/ticket-comment`) and view timelines (`POST /api/admin/ticket-timeline`).
5. Counter hook auto-generates ticket codes (`T###`).

### 3.8 Invoicing

1. Simple invoices: `POST /api/admin/create-invoice`, `POST /api/admin/get-invoice`, `GET /api/admin/list-invoices`, `PUT /api/admin/update-invoice`, `DELETE /api/admin/delete-invoice`.
2. Detailed invoices with line items: `POST /api/admin/create-detailed-invoice`, `PUT /api/admin/invoice/:id`.
3. `Invoice` and `Detailed Invoice` schemas calculate totals, taxes, and auto-generate IDs (`INV-YYYY-###`).
4. Clients access their invoices through `/api/client/invoices` and `/api/client/invoice-details`.

### 3.9 Policy, Reviews, Todos, Schedules

- Policies: CRUD via `/create-policy`, `/update-policy`, `/get-policy`; enforced singleton pattern in schema.
- Reviews: `GET /api/admin/reviews`, `DELETE /api/admin/reviews` (admin moderation).
- Todos: Admins manage personal tasks with `/api/admin/todos` suite (create, list, toggle, update, delete).
- Schedules: Create with `/create-schedule`, list using `/get-schedule`; validation ensures valid Meet links.

## 4. Employee Workflows

### 4.1 Daily Attendance

1. Employee logs in and receives tokens.
2. Punch in via `GET /api/employee/check-in` – creates or updates `AttendanceLog` with punch-in time.
3. Punch out via `GET /api/employee/check-out` – pre-save hook calculates total hours and sets status (`Present`, `Half-Day`, `Absent`).
4. Check punch status with `GET /api/employee/punch-status`.
5. View attendance analytics through `/attendance-analytics`, `/weekly-attendance`, `/attendance/daily|weekly|monthly`.

### 4.2 Task & Project Execution

1. Fetch assigned projects: `GET /api/employee/my-projects`.
2. Retrieve tasks: `GET /api/employee/my-tasks`.
3. Update task status: `POST /api/employee/update-task`.
4. Assign subtasks to colleagues (where permitted) using `/assign-task`.
5. Access project displays: `GET /api/employee/project-display/:project_id`.

### 4.3 Leave Management

1. Apply for leave: `POST /api/employee/appy-leave` (stores request in `Leave` collection).
2. View history: `GET /api/employee/leave-history`.
3. Check specific leave policies: `/get-leaves`, `/leave/:id`, `/get-policy`.
4. HR/Admin decisions reflected in status fields (`Pending`, `Approved`, `Rejected`).

### 4.4 Skill & Profile Management

- Profile: `GET /api/employee/my-profile`, updates via shared employee endpoints.
- Colleague visibility: `GET /api/employee/department-colleagues`.
- Skills: `GET /api/employee/my-skills`, `POST /api/employee/add-skill`, `PUT /api/employee/update-skill`, `DELETE /api/employee/delete-skill` (unique index prevents duplicates).

### 4.5 Ticket Collaboration

1. Assigned tickets via `GET /api/employee/tickets`.
2. Add comments with `POST /api/employee/ticket-comment`.
3. Update status (`POST /api/employee/update-ticket-status`).
4. Review timelines (`POST /api/employee/ticket-timeline`).

### 4.6 Personal Productivity

- Todos: Full CRUD at `/api/employee/todos` with toggle, edit, and delete endpoints.
- My Day / Important tasks managed via request payload flags.
- Reminders and subtasks stored alongside todo items with timestamped updates.

### 4.7 Social Features

- Team birthdays: `GET /api/employee/team-birthdays-today` identifies celebrants.
- Send wishes: `POST /api/employee/send-birthday-wish` (enforced by unique `BirthdayWish` index for one wish per day per colleague).

## 5. Client Workflows

### 5.1 Support Ticket Lifecycle

1. Client logs in and obtains tokens.
2. Creates ticket via `POST /api/client/create-ticket`; pre-save hook assigns `T###` code.
3. Views ticket list with `GET /api/client/tickets`, filtered by status/priority.
4. Adds comments (`POST /api/client/ticket-comment`) and fetches ticket details (`POST /api/client/ticket-details`).
5. Toggles resolution acknowledgement using `POST /api/client/toggle-ticket-resolution` (records timeline events).
6. Retrieves chronological updates with `POST /api/client/ticket-timeline`.

### 5.2 Project Visibility

1. List client projects: `GET /api/client/projects` with optional status filter.
2. Dashboard overview: `GET /api/client/overview/projects` calculates completion metrics, monthly trends, and task category breakdown.
3. Detailed project view: `GET /api/client/projects/:projectId/details` returns team composition, progress, tasks, and financials.
4. Monthly task completion report: `POST /api/client/reports/monthly-task-completion` aggregates completed tasks by month for the selected year.

### 5.3 Financial Operations

1. Invoice listing: `GET /api/client/invoices` with optional status filters.
2. Detailed invoice retrieval: `POST /api/client/invoice-details` (ensures client owns the invoice).
3. Analytics: Summary fields in responses include totals, pending amounts, overdue amounts, and counts by status.

### 5.4 Account Management & Feedback

- Profile update: `PUT /api/client/update` (validates contact details).
- Profile view: `GET /api/client/my-profile` (returns stats on projects, tickets, invoices, pending amount).
- Reviews: `POST /api/client/reviews`, `GET /api/client/reviews`, `DELETE /api/client/reviews` for client-submitted feedback.

## 6. System-Level Background Processes

- **ID Counters** – Mongoose counter collections maintain sequential numbers for employees, invoices, and tickets to avoid collisions.
- **Schema Hooks** – Pre-save hooks enforce business invariants (e.g., single policy document, default leave configuration, skill uniqueness).
- **Aggregations** – Large analytics endpoints use MongoDB aggregation pipelines; indexes are defined on frequently queried fields (status, date ranges, references).

## 7. Operational Considerations

- **Environment Variables** – `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and optional `PORT` must be configured before startup.
- **Server Startup** – Execute from project root (`npm run start:dev` or `npm start` post-build). Running `nodemon` directly inside `src/` fails because compiled output lives in `dist/`.
- **Deployment** – Docker image builds TypeScript into `dist/` and launches `node dist/index.js`. Vercel configuration routes all traffic to the compiled entry point.

---
Prepared by: GitHub Copilot (AI Assistant)

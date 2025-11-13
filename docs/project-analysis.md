# CRM Node Server – Technical Analysis

_Date: 2025-11-10_

## 1. Executive Summary

This document captures a detailed analysis of the CRM Node Server codebase to prepare for the upcoming team meeting. It covers architecture, request flow, domain modules, data modeling, and areas of concern.

## 2. Stack and Tooling

- Runtime: Node.js 18, TypeScript 5.7.
- Framework: Express.js with CommonJS modules compiled from TypeScript.
- Database: MongoDB via Mongoose ODM.
- Auth: JWT (access + refresh tokens), bcrypt for password hashing, role-based access control.
- Dev Experience: Nodemon for hot reloads, ts-node for TypeScript execution, strict TypeScript configuration enabled.
- Deployment: Dockerfile (Node 18 Alpine) and Vercel configuration for serverless packaging.

## 3. Project Structure Overview

```
src/
  index.ts              Express bootstrap, middleware, router mounting
  db.ts                 MongoDB connection helper
  controllers/          Business logic grouped by domain
  dtos/                 TypeScript DTO and interface definitions
  middleware/           Authentication, authorization, token utilities
  models/               Mongoose schemas and discriminators
  routes/               Express route definitions per domain
```

The build output is emitted into `dist/` for production usage.

## 4. Application Bootstrap (`src/index.ts`)

1. Loads environment variables with `dotenv` and connects to MongoDB via `db.connect()`.
2. Configures Express middleware in order:
   - CORS with wide-open policy (origin `*`, credentials allowed).
   - Cookie parsing.
   - JSON and URL-encoded body parsers.
3. Registers routers under the `/api` namespace:
   - `/api/admin`
   - `/api/auth`
   - `/api/employee`
   - `/api/client`
4. Starts HTTP server on `process.env.PORT || 8080`.

## 5. Database Layer

### 5.1 Base User Model

- Located at `models/user.ts`.
- Uses Mongoose discriminator pattern to derive `Admin`, `Employee`, and `Client` models.
- Common fields: `email`, `password`, `role`, `createdAt`, `lastLogin`.

### 5.2 Key Domain Models

| Model              | Purpose                                                 | Notable Fields / Relationships                                   |
| ------------------ | ------------------------------------------------------- | ---------------------------------------------------------------- |
| `Admin`            | Admin user records                                      | `admin_id`, `username`                                           |
| `Employee`         | Employee profiles with auto-generated IDs (`QMARK####`) | Department, role references, HR attributes, link to leave policy |
| `Department`       | Department catalog                                      | `manager_id` reference                                           |
| `Role`             | Role-based permissions container                        | `name`, `permissions`                                            |
| `Client`           | Client organization profiles                            | Contact info                                                     |
| `Project`          | Project metadata                                        | Client, teams (members/leads/managers), status, tags             |
| `Task`             | Tasks linked to projects                                | Assigned employees, status, due dates                            |
| `AttendanceLog`    | Daily punch-in/out records                              | Auto-computed total hours + status                               |
| `Leave`            | Individual leave applications                           | `LeaveType` enum, approval status                                |
| `LeaveForEmp`      | Leave policy templates                                  | Distinguishes default/specific/holiday policies                  |
| `Invoice`          | Standard invoices                                       | Auto ID `INV-YYYY-###`, client/project links                     |
| `Detailed Invoice` | Rich invoice variant with line items                    | Auto ID, tax calculation                                         |
| `Ticket`           | Support ticketing                                       | Auto ticket codes (`T###`), comments, status history             |
| `Schedule`         | Meeting schedules                                       | Employee list, meet link validation                              |
| `Todo`             | Personal todos (admin or employee)                      | Subtasks, reminders                                              |
| `Skill`            | Employee skill tracking                                 | Proficiency tiers                                                |
| `Policy`           | Single company policy document                          | Enforced singleton via hook                                      |
| `Review`           | Feedback from users                                     | Rating + comment                                                 |
| `ProjectDisplay`   | Project-specific presentation content                   | One document per project                                         |
| `BirthdayWish`     | Tracking birthday wishes to prevent duplicates          | Unique compound index                                            |

Indices have been added to support frequent queries (e.g., employee ID uniqueness, attendance logs by employee/date, ticket codes, invoice lookups).

## 6. DTO Layer

Interfaces under `src/dtos/` describe request/response shapes for type safety:

- `userdto.ts`: Base user, login payloads, client extensions.
- `employeedto.ts`, `departmentdto.ts`, `invoicedto.ts`, `roledto.ts`: Domain-specific structures.
  These DTOs are used primarily inside controllers for validation and update operations.

## 7. Authentication and Authorization

1. **Login Flow (`AuthService.login`)**
   - Validates credentials using bcrypt.
   - Emits access (1 day) and refresh (7 days) tokens.
   - Returns validated user payload (`id`, `email`, `role`).
2. **Token Generation (`middleware/tokenMiddleware.ts`)**
   - Wraps JWT signing for access and refresh tokens.
3. **JWT Verification (`middleware/verifyToken.ts`)**
   - Extracts Bearer token, verifies signature.
   - Attaches decoded payload to `req.user`.
   - Handles missing/invalid tokens with 401 responses.
4. **Role Guard (`middleware/roleguard.ts`)**
   - Ensures authenticated user has required role(s) before hitting controller handlers.
5. **Refresh Flow**
   - `/api/auth/regenerate-tokens` uses refresh token to mint new tokens.

## 8. Routing and Controller Responsibilities

### 8.1 `/api/auth`

- `POST /create-admin`: Seed admins.
- `POST /login`: Authenticate users.
- `POST /regenerate-tokens`: Refresh JWTs.

### 8.2 `/api/admin` (protected by `roleGuard(["Admin"])`)

Broad administrative surface area:

- Admin, employee, client CRUD operations.
- Department and role management.
- Project lifecycle: creation, updates, assignment of managers/leaders/members.
- Task assignment and analytics (status counts, project stats).
- Attendance reporting (daily/weekly/monthly summaries, punch logs).
- Leave approvals (`getAllLeaves`, `updateLeaveStatus`, policy management).
- Ticket moderation (list/update/delete, comments, timelines).
- Invoicing (simple and detailed variants) including statistics.
- Schedules, reviews, policy documents, todo management.
- Misc dashboards: employee status count, project/client totals, activity feeds.

_Observation:_ `AdminController` spans >5k lines; logical candidates for refactoring into modules.

### 8.3 `/api/employee` (protected by `roleGuard(["Employee"])`)

- Employee profile retrieval and updates.
- Attendance actions (check-in/out, punch status, analytics).
- Leave application and history.
- Project access (`my-projects`, project displays).
- Task lifecycle (assignment, status updates, lists).
- Skill CRUD, todo management, policy visibility.
- Ticket handling (assigned tickets, comments, timeline).
- Social features (team birthdays, sending wishes).

### 8.4 `/api/client` (protected by `roleGuard(["Client"])`)

- Profile management.
- Ticket submission, comment threads, resolution toggles, timelines.
- Project visibility with summaries and detailed views.
- Invoice lists and details, financial stats.
- Reviews, project overview analytics, monthly task completion reports.

### 8.5 `/api/admin` + `/api/employee` Shared Endpoints

Some features (todos, attendance stats) are exposed to both roles with role-specific data selections.

## 9. End-to-End Workflow

### 9.1 Request Lifecycle (Generic)

1. **HTTP Request** originates from the UI or an integration client targeting an `/api/*` route.
2. **Express Router Resolution** maps the path to the corresponding router module (`routes/*.ts`).
3. **Middleware Chain** executes in order:
   - `authMiddleware` validates the JWT, populates `req.user`, and blocks unauthenticated access.
   - `roleGuard([...])` checks the caller's role(s) before entering the route handler.
   - Optional request-level middleware (e.g., additional auth, validation) if present on the route.
4. **Controller Handler** runs domain logic—reading DTOs, querying Mongoose models, orchestrating updates, and assembling response payloads.
5. **Mongoose Layer** executes the actual database operations; pre-save hooks handle side effects (ID generation, audit data, computed fields).
6. **Response Serialization** returns JSON to the caller; errors short-circuit via thrown exceptions or manual responses.

### 9.2 Admin Workflow Example – Employee Onboarding

1. Admin logs in via `/api/auth/login` and stores issued access & refresh tokens.
2. Admin submits new employee data to `/api/admin/createemployee`.
3. Middleware verifies admin privileges; controller hashes default credentials, sets department/role references, and saves the employee record.
4. Employee creation triggers the `Employee` pre-save hook to assign the next sequential `QMARK####` identifier and ensure uniqueness.
5. Response returns employee profile details; the frontend can now notify HR/Payroll systems or prompt follow-up actions (e.g., leave policy assignment).

### 9.3 Employee Daily Workflow

1. Employee authenticates via `/api/auth/login` from the portal.
2. Upon arrival, the employee uses `/api/employee/check-in` to punch in; a new `AttendanceLog` entry captures punch time.
3. Employee reviews assigned work through `/api/employee/my-tasks` and updates progress with `/api/employee/update-task`.
4. Breaks and shift completion are recorded via `/api/employee/check-out`; the `AttendanceLog` pre-save hook computes total hours and status (`Present`, `Half-Day`, `Absent`).
5. Optional actions include applying for leave (`/api/employee/appy-leave`), updating skills, managing todos, or commenting on tickets.
6. Managers view aggregated attendance and task stats through admin analytics endpoints.

### 9.4 Client Support Workflow

1. Client logs in and lands on the client dashboard.
2. When an issue occurs, the client raises a ticket through `/api/client/create-ticket`; the ticket hook auto-generates a `T###` code.
3. Admins/Employees monitor tickets via `/api/admin/tickets` or `/api/employee/tickets`, assign team members, and collaborate via `/ticket-comment`.
4. Project and invoice visibility flows through `/api/client/projects`, `/api/client/invoices`, and `/api/client/invoice-details`, allowing clients to track delivery and financials.
5. Once resolved, the client can toggle resolution status with `/api/client/toggle-ticket-resolution`, providing bilateral confirmation that drives SLA reporting.

## 10. Observations and Risks

1. **Controller Size and Complexity**

   - `AdminController.ts` and `EmployeeController.ts` are extremely large, mixing concerns (analytics, CRUD, reporting). Recommend modularization (e.g., projects, attendance, invoicing sub-controllers/services).

2. **Validation Layer**

   - Validation is mostly manual. No centralized validation middleware or schema validation (e.g., Zod/Joi). Consider adding to reduce duplicated guards.

3. **Error Handling**

   - Inconsistent error responses (mix of thrown errors and manual 400/500 responses). Introduce centralized error middleware.

4. **Security**

   - CORS is fully open (`origin: '*'` combined with `credentials: true`). Tighten allowed origins for production deployments.
   - No rate limiting or brute-force protection on auth endpoints.

5. **Logging and Monitoring**

   - Minimal logging (console output). For production readiness, integrate structured logging and request tracing.

6. **Testing**

   - No automated tests (`npm test` placeholder). Regression risk is high.

7. **Code Style**

   - Mixed usage of `module.exports` and ES module syntax in TypeScript files; maintain consistency.
   - Some controllers import Date libraries (`dayjs`, `date-fns`) but may not leverage in all scenarios.

8. **Performance**

   - Heavy aggregation queries executed directly in controllers; ensure proper indexing (currently good coverage, but revisit with metrics).

9. **Error in Nodemon Startup**
   - Terminal history shows `nodemon index.ts` invoked inside `src/`. Project expects `ts-node` or `nodemon ./src/index.ts` from project root with correct TS config. Document for team to avoid confusion.

## 11. Recommended Next Steps

1. **Refactor Controllers**

   - Split monolithic controllers into feature modules (e.g., `controllers/admin/projects.ts`).

2. **Introduce Service Layer**

   - Abstract business logic away from route handlers for testability.

3. **Validation Middleware**

   - Adopt schema validation to enforce payload contracts and reduce boilerplate.

4. **Logging and Monitoring**

   - Integrate Winston/Pino and consider Application Insights or similar for production.

5. **Testing Strategy**

   - Establish unit tests for utilities/controllers and integration tests for critical flows (auth, employee management, projects, attendance).

6. **Security Hardening**

   - Restrict CORS, add rate limiting, review JWT secret management.

7. **Documentation**

   - Auto-generate API specs (e.g., OpenAPI) to describe endpoints and payloads.

8. **Operational Concerns**
   - Add health check route, readiness probe, and graceful shutdown handling for the server.

## 12. Meeting Prep Checklist

- Review document collectively to confirm domain responsibilities are well-understood.
- Identify owners for refactoring tasks.
- Decide on immediate hotfixes (e.g., CORS tightening, nodemon script updates).
- Plan sprint backlog around recommended next steps.

---

Prepared by: GitHub Copilot (AI Assistant)

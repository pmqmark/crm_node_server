# DTO Reference – CRM Node Server

_Date: 2025-11-10_

This guide documents every Data Transfer Object (DTO) defined under `src/dtos/`. Use it to understand expected payloads, validation rules, and how controllers consume each shape.

## 1. Purpose of DTO Layer

- Provide TypeScript types for request bodies and persistence operations.
- Enforce consistent field names across controllers and services.
- Improve maintainability by centralizing payload definitions.
- Act as lightweight documentation for API integrators.

---

## 2. `userdto.ts`

### 2.1 Base Interfaces

| Interface         | Description                                                                           | Key Fields                                                                       | Consumers                                          |
| ----------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| `IUser`           | Core user profile shared by all roles. Extends `mongoose.Document` (implicit import). | `email`, `password`, `role`, `createdAt`, `lastLogin`                            | `models/user.ts` base schema, authentication flows |
| `CreateUserDto`   | Generic helper for creating bare users (rarely used directly).                        | `role`, `email`, `password`                                                      | Potential seed scripts or future utilities         |
| `User`            | Minimal identity object attached to `req.user` after auth.                            | `id`, `email`, `role`                                                            | `middleware/verifyToken.ts`, `roleGuard`           |
| `loginUserDto`    | Payload for `/api/auth/login`.                                                        | `email`, `password`                                                              | `AuthService.login`                                |
| `validitatedUser` | Authenticated user representation used for token generation.                          | `id` (`Types.ObjectId`), `email`, `role`, optional `accesstoken`, `refreshtoken` | `AuthService`, `tokenMiddleware`                   |

### 2.2 Role-Specific DTOs

| Interface            | Description                                                      | Additional Fields                                                                                         | Usage                                                       |
| -------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `IAdmin`             | Extends `IUser` for administrators.                              | `admin_id`, `username`                                                                                    | `models/admin.ts`, admin creation APIs                      |
| `IEmployee`          | Extends `IUser` for staff members.                               | Personal info (names, contact, address), job status, references to `department_id`, `role_id`, `leaveRef` | `models/employee.ts`, employee controllers                  |
| `IClient`            | Extends `IUser` for clients.                                     | `companyName`, `contactPerson`, `phone`, optional `address`, `description`                                | `models/client.ts`, client controllers                      |
| `ClientUpdateFields` | Flexible structure for client profile updates (index signature). | Optional `companyName`, `contactPerson`, `phone`, `address`, `description`                                | `ClientController.updateClient`, other client mod endpoints |

**Notes**

- Several interfaces extend `mongoose.Document` without importing it explicitly. TypeScript still infers due to global ambient declarations, but consider adding explicit imports for clarity.
- `role` enum on `IUser` is limited to `"admin" | "employee"`; clients also derive from `IUser` but rely on discriminator value set in the model (string literal will match actual stored role).

---

## 3. `admindto.ts`

| Interface        | Description                                                                   | Fields                                      | Usage                     |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------- | ------------------------- |
| `CreateAdminDto` | Payload for seeding/creating admin accounts through `/api/auth/create-admin`. | `email`, `password`, `username`, `admin_id` | `AuthService.createAdmin` |

- Password arrives in plaintext and is hashed within the controller (`bcrypt.hash`).
- `admin_id` must be unique; duplication errors surface from Mongoose unique index in `models/admin.ts`.

---

## 4. `employeedto.ts`

### 4.1 Creation Payload

| Interface           | Description                                                                         | Highlights                                                                                                                                        | Usage                                                                |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `CreateEmployeeDto` | Full payload required when registering an employee via `/api/admin/createemployee`. | Requires complete identity, contact, address, hire metadata. Optional `employee_id` (generated if omitted), `department_id`, `role_id`, `status`. | `AdminController.createEmployee`, potentially other onboarding flows |

- `department_id` and `role_id` use `Schema.Types.ObjectId` references; controllers validate existence before assignment.
- `status` enumerates employment state (`Full-Time`, `Contract`, `Probation`, `WFH`). Defaults handled inside the controller.

### 4.2 Update Payload

| Interface              | Description                                    | Characteristics                                                                                                          | Usage                                                                 |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `EmployeeUpdateFields` | Flexible update map for partial modifications. | Index signature `[key: string]: any` allows dynamic fields, but specific optional properties are listed for type safety. | `AdminController.updateEmployee`, `EmployeeController.updateEmployee` |

- Controllers sanitize allowed fields before updating to avoid unintended writes.

---

## 5. `departmentdto.ts`

| Interface     | Description                                              | Fields                                                            | Usage                                                           |
| ------------- | -------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `IDepartment` | DTO describing department records for create/update ops. | `id?`, `name`, `description`, optional `manager_id`, `created_at` | `DepartmentController.updateDepartment`, `models/department.ts` |

- `manager_id` references an `Employee` document.
- `created_at` is typically set by the database layer (`default: Date.now`), but included here for completeness.

---

## 6. `roledto.ts`

| Interface | Description                                                        | Fields                                                      | Usage                                          |
| --------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------- |
| `IRole`   | Role metadata for RBAC configuration. Extends `mongoose.Document`. | `name`, `description`, optional `permissions` string array. | `models/role.ts`, role-related admin endpoints |

- Roles can include arbitrary `permissions` strings to support granular checks in the future.

---

## 7. `invoicedto.ts`

DTOs cover both simple and detailed invoice variants.

### 7.1 Simple Invoice DTOs

| Interface          | Description                                   | Fields                                                                                                            | Usage                           |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `CreateInvoiceDto` | Payload for `POST /api/admin/create-invoice`. | `client_id`, optional `project_id`, `amount`, optional `description`, optional `invoiceDate`, required `dueDate`. | `AdminController.createInvoice` |
| `UpdateInvoiceDto` | Payload for `PUT /api/admin/update-invoice`.  | Target by `id` or `invoice_id`; update `status`, `amount`, `description`, `dueDate`, `paymentDate`.               | `AdminController.updateInvoice` |
| `GetInvoiceDto`    | Query helper (fetch by `id` or `invoice_id`). | `id?`, `invoice_id?`                                                                                              | `AdminController.getInvoice`    |
| `DeleteInvoiceDto` | Delete helper (identify invoice).             | `id?`, `invoice_id?`                                                                                              | `AdminController.deleteInvoice` |

### 7.2 Detailed Invoice DTOs

| Interface                | Description                                                            | Fields                                                                                                                                                       | Usage                            |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `detailCreateInvoiceDto` | Payload for rich invoices (`POST /api/admin/create-detailed-invoice`). | `client_id`, optional `project_id`, `items[]` with service details, optional `tax_rate`, `description`, `terms`, optional `invoiceDate`, required `dueDate`. | `AdminController.createInvoice1` |
| `detailUpdateInvoiceDto` | Update payload for detailed invoices (`PUT /api/admin/invoice/:id`).   | Target by `id`/`invoice_id`; optional `items[]`, `tax_rate`, `description`, `terms`, `dueDate`, `status`, `paymentDate`.                                     | `AdminController.updateInvoice1` |

**Item Structure Notes**

- `service_type` controls interpretation: `hourly` uses `hours * rate_per_hour`, `fixed` or `subscription` uses `fixed_price * quantity`.
- Optional fields allow supporting multiple billing models in the same schema.

---

## 8. DTO Usage Map

| DTO                                                                                                                             | Primary Controllers                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `CreateAdminDto`                                                                                                                | `AuthService.createAdmin`                                                              |
| `CreateEmployeeDto`, `EmployeeUpdateFields`                                                                                     | `AdminController`, `EmployeeController`                                                |
| `IDepartment`                                                                                                                   | `AdminController`, `DepartmentController`                                              |
| `IRole`                                                                                                                         | `AdminController`                                                                      |
| `CreateInvoiceDto`, `UpdateInvoiceDto`, `GetInvoiceDto`, `DeleteInvoiceDto`, `detailCreateInvoiceDto`, `detailUpdateInvoiceDto` | `AdminController` (invoice suite)                                                      |
| `IUser`, `IAdmin`, `IEmployee`, `IClient`, `ClientUpdateFields`, `loginUserDto`, `validitatedUser`                              | `AuthService`, `AdminController`, `EmployeeController`, `ClientController`, middleware |

---

## 9. Recommendations

1. **Explicit Imports** – Several interfaces extend `Document` without importing from `mongoose`. Adding `import { Document } from "mongoose";` improves clarity.
2. **Validation Schemas** – Pair DTOs with runtime validators (e.g., Zod) to enforce constraints beyond TypeScript compile-time checks.
3. **Enum Consolidation** – Extract shared enums (employment status, invoice status, service types) into reusable modules to avoid drift between DTOs and models.
4. **API Documentation Integration** – Use these DTO definitions to generate OpenAPI specs, ensuring frontend teams have synchronized contracts.

---

Prepared by: GitHub Copilot (AI Assistant)

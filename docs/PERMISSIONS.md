# Role-Based Access Control (RBAC) System

This document outlines the RBAC permission structure implemented in the application. It details how resources and actions combine to form permissions, where they are enforced, and how they affect the user experience.

## The RBAC Model

The application uses a **Resource-Action** model. 
```text
Permission = Resource + Action
```

For example:
```text
patients:create
```
- **`patients`** = The Resource (what is being accessed)
- **`create`** = The Action (what the user can do)
- **Together** they determine that the user is allowed to create patient records.

Permissions are assigned to **Permission Groups** or directly to **Roles**, which are then assigned to **Users**.

## Permission Matrix

| Resource | Create | Read | Update | Delete | Special Actions |
| :--- | :---: | :---: | :---: | :---: | :--- |
| dashboard | — | ✓ (view) | — | — | |
| users | ✓ | ✓ | ✓ | ✓ | assign_role (unused) |
| permissions | — | ✓ | ✓ | — | |
| permission_groups | ✓ | ✓ | ✓ | ✓ | assign_permission, remove_permission, add_user, remove_user |
| roles | ✓ | ✓ | ✓ | ✓ | assign_permission (unused) |
| patients | ✓ | ✓ | ✓ | ✓ | receive_patient, receive_appointment, schedule, export (unused) |
| form_fields | ✓ | ✓ | ✓ | ✓ | |
| branding | ✓ | ✓ | ✓ | ✓ | |
| form_field_groups | ✓ | ✓ | ✓ | ✓ | |
| diagnosis_forms | ✓ | ✓ | ✓ | ✓ | |
| departments | ✓ | ✓ | ✓ | ✓ | manage (unused) |
| user_titles | ✓ | ✓ | ✓ | ✓ | manage (unused) |

---

## Permission Documentation

### `dashboard`
**Purpose**: Represents the main analytics and summary dashboard of the system.
- **`dashboard:view`**
  - **What It Allows**: Allows the user to view the dashboard and receive live socket updates.
  - **Frontend Enforcement**: Protects the Dashboard menu item (`/dashboard`) in the sidebar. Used as a fallback permission for some finance modules.
  - **Backend Enforcement**: Subscribes user to `dashboard:update` socket events (`dashboardSocketHandler.js`).
  - **Typical User**: Admin, Executive, Doctor.

### `users`
**Purpose**: User account administration and management.
- **`users:create`**
  - **What It Allows**: Allows creating new internal user accounts.
  - **Frontend Enforcement**: Protects the "Add User" button.
  - **Backend Enforcement**: Protects `POST /api/users`.
- **`users:read`**
  - **What It Allows**: Allows viewing the user list and individual profiles.
  - **Frontend Enforcement**: Protects the "Users" navigation link and user table.
  - **Backend Enforcement**: Protects `GET /api/users` and `GET /api/users/:id` (users can always read their own profile without this).
- **`users:update`**
  - **What It Allows**: Allows modifying user details, status, and resetting passwords.
  - **Frontend Enforcement**: Edit buttons in the user table.
  - **Backend Enforcement**: Protects `PUT /api/users/:id`, `PATCH /api/users/:id/toggle-status`, and `POST /api/users/:id/reset-password`. Users can update their own signature without this, but need this to update other fields.
- **`users:delete`**
  - **What It Allows**: Allows deleting a user account.
  - **Frontend Enforcement**: Delete buttons in the user table.
  - **Backend Enforcement**: Protects `DELETE /api/users/:id`.

### `permissions`
**Purpose**: System-wide permission catalog configuration.
- **`permissions:read`**
  - **What It Allows**: Allows viewing the list of all available permissions in the system.
  - **Frontend Enforcement**: Protects "Permission Management" navigation link.
  - **Backend Enforcement**: Protects `GET /api/permissions`.
- **`permissions:update`**
  - **What It Allows**: Allows updating permission details.
  - **Backend Enforcement**: Protects various `PUT` and `PATCH` endpoints for permissions.

### `permission_groups`
**Purpose**: Logical groupings of permissions to simplify role assignment.
- **`permission_groups:create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Standard CRUD operations for permission groups.
  - **Frontend Enforcement**: Protects "Permission Group Management" navigation.
  - **Backend Enforcement**: Protects `POST / GET / PUT / DELETE` endpoints for `/api/permission-groups`.
- **Special Actions**:
  - `permission_groups:assign_permission`: Allows adding a permission to a group.
  - `permission_groups:remove_permission`: Allows removing a permission from a group.
  - `permission_groups:add_user`: Allows assigning a user directly to a permission group.
  - `permission_groups:remove_user`: Allows removing a user from a permission group.

### `roles`
**Purpose**: RBAC roles (e.g., Doctor, Nurse, Receptionist).
- **`roles:create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Standard CRUD operations for roles.
  - **Frontend Enforcement**: Protects "Role Management" navigation link.
  - **Backend Enforcement**: Protects `POST / GET / PUT / DELETE` endpoints for `/api/roles`.

### `patients`
**Purpose**: Patient registry and encounter management.
- **`patients:create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Standard CRUD operations for patient records.
  - **Frontend Enforcement**: Protects "Patients" navigation, Patient Registry, Identification Slip configuration.
  - **Backend Enforcement**: Protects `POST / GET / PUT / DELETE` endpoints for `/api/patients`.
- **Special Actions**:
  - `patients:receive_appointment`: Protects the "Appointments" navigation link and enables internal notifications for incoming appointments.
  - `patients:receive_patient`: Protects the "Workflow Inbox" navigation link and enables internal notifications for patient arrival/workflow handoffs.
  - `patients:schedule`: Controls the visibility of the "Schedule" button in the patient table.

### `form_fields` & `form_field_groups`
**Purpose**: Customizing the dynamic patient intake forms.
- **`create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Creating and organizing custom fields and groups for the patient registration process.
  - **Frontend Enforcement**: Protects the "Configure Patient Forms" navigation link.
  - **Backend Enforcement**: Protects endpoints on `/api/form-fields` and `/api/form-field-groups`.

### `branding`
**Purpose**: System appearance, logos, and color schemes.
- **`branding:create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Modifying the platform's visual identity.
  - **Frontend Enforcement**: Protects the "Branding" navigation link.
  - **Backend Enforcement**: Protects endpoints on `/api/branding`.

### `diagnosis_forms`
**Purpose**: Configuration of clinical diagnosis forms, templates, and medical diagram categories.
- **`diagnosis_forms:create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Allows managing templates, forms, and diagrams used during clinical encounters.
  - **Frontend Enforcement**: Protects "Diagnosis" and "Medical Diagrams" navigation links, and the respective management UI elements.
  - **Backend Enforcement**: Protects endpoints in `diagnosisFormConfigRoutes.js`, `medicalDiagramRoutes.js`, etc.

### `departments`
**Purpose**: Hospital/clinic organizational units.
- **`departments:create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Managing physical or logical departments.
  - **Frontend Enforcement**: Protects "Departments" navigation link and department details UI.
  - **Backend Enforcement**: Protects endpoints on `/api/departments`.

### `user_titles`
**Purpose**: Professional titles for staff (e.g., Dr., Prof., RN).
- **`user_titles:create`** / **`read`** / **`update`** / **`delete`**
  - **What It Allows**: Managing standardized titles for users.
  - **Frontend Enforcement**: Protects "User Titles" navigation link.
  - **Backend Enforcement**: Protects endpoints on `/api/user-titles`.

---

## Permissions Not Currently Detected in Code

The following permissions are present in the seed file but are **not currently detected in active usage** in the codebase:

| Permission | Status | Notes |
| :--- | :--- | :--- |
| `users:assign_role` | Not detected | Roles are assigned to users, but this specific string is not checked. Endpoints use `checkPermission("users", "assign_role")` which translates to `users:assign_role`, but some routes might be missing it. |
| `roles:assign_permission` | Not detected | No active permission check found. |
| `patients:export` | Not detected | Export functionality for patients is not currently guarded by this permission. |
| `departments:manage` | Not detected | Generic management permission unused; CRUD is used instead. |
| `user_titles:manage` | Not detected | Generic management permission unused; CRUD is used instead. |

## Permissions Used in Code but Missing from Seed

During the audit, hundreds of permissions were found in the codebase (backend route guards and frontend navigation guards) that are **NOT** present in the initial seed file. 

Examples of active permissions missing from the initial seed:
| Permission | Found In | Expected Resource/Action | Issue |
| :--- | :--- | :--- | :--- |
| `WORKFLOW:READ` | Frontend Navigation | `workflow:read` | Used to restrict "Workflow Inbox" |
| `BILLING_SERVICE:VIEW` | Frontend / Backend | `billing_service:view` | Protects billing endpoints and UI |
| `CASHIER_QUEUE:VIEW` | Frontend Navigation | `cashier_queue:view` | Protects cashier desk |
| `CLINICAL_SUGGESTION:MANAGE` | Frontend Navigation | `clinical_suggestion:manage` | Protects clinical suggestions |
| `PHARMACY:VIEW` | Frontend Navigation | `pharmacy:view` | Protects pharmacy module |
| `AUDIT_LOG:VIEW` | Frontend Navigation | `audit_log:view` | Protects admin audit logs |

*(Note: The seed file has been manually updated to include a selection of these missing permissions to ensure baseline functionality for these modules.)*

---

## RBAC Implementation Audit Summary

- **Total seeded permissions**: 52 (in original seed)
- **Permissions confirmed as actively used**: 47
- **Permissions not detected in active usage**: 5
- **Permissions used in code but missing from seed**: 100+ (Extensive usage across Finance, Radiology, Pharmacy, Workflow, Clinical Operations).
- **Naming inconsistencies**: Backend uses `checkPermission("resource", "action")` which successfully translates to `resource:action`. Frontend uses upper-case `RESOURCE:ACTION` (e.g., `USERS:READ`). This is handled correctly by the `hasPermission` utilities.

# PRD: Admin Dashboard for NESYA FIR Assistant

## 1. Document Overview
- **Product**: Admin Dashboard for NESYA FIR Assistant
- **Version**: 1.0
- **Status**: Draft
- **Date**: 2026-07-30
- **Owner**: Product / Engineering

## 2. Purpose
The admin dashboard will give authorized administrators a centralized interface to monitor, review, and manage the NESYA FIR workflow. It will support oversight of users, conversations, FIR reports, and audit activity while keeping the system secure and operational.

## 3. Problem Statement
The current system supports end-user FIR generation through a chat-based interface, but it does not yet provide a dedicated management layer for admins. Administrators need a way to:
- monitor system usage and health,
- review and manage user accounts,
- inspect and manage FIR conversations and generated reports,
- audit sensitive events and investigate issues.

## 4. Goals
### Primary Goals
- Provide a secure admin experience for superusers.
- Make user, conversation, FIR, and audit data easy to review.
- Reduce manual effort in monitoring and support operations.
- Improve trust, transparency, and operational control.

### Secondary Goals
- Provide visibility into NLP/rule-engine quality signals.
- Improve incident investigations and support workflows.
- Lay the foundation for future analytics and reporting.

## 5. Non-Goals
- Full case management system for police workflows
- Public-facing dashboards for end users
- Complex workflow automation in v1
- Advanced analytics beyond operational reporting

## 6. Target Users
### Primary Persona: Super Admin
- Can access all admin capabilities
- Needs high-level monitoring and action controls

### Secondary Persona: Support/Admin Operator
- Reviews user issues, conversations, and FIR reports
- Can inspect data but may have limited permissions

## 7. Scope
### In Scope for MVP
- Admin authentication and authorization
- Dashboard overview with summary metrics
- User management
- Conversation management
- FIR report management
- Audit log viewing
- Search, filters, pagination, and basic exports

### Out of Scope for MVP
- Bulk batch actions across all entities
- Advanced predictive analytics
- Live streaming monitoring
- Complex workflow approvals

## 8. User Stories
- As an admin, I want to log in securely to the admin panel so I can access protected dashboard features.
- As an admin, I want to see a summary of system activity so I can understand current usage and health.
- As an admin, I want to view all users so I can monitor account status and verify activity.
- As an admin, I want to inspect conversations so I can review user progress and identify issues.
- As an admin, I want to inspect FIR reports so I can verify generated content and quality.
- As an admin, I want to audit critical events so I can investigate security or operational issues.
- As an admin, I want to export data so I can create offline reports.

## 9. Functional Requirements
### 9.1 Authentication and Authorization
- Admin routes must require JWT authentication.
- Only users with superuser privileges can access the dashboard.
- Unauthorized users must be redirected or blocked with a clear message.

### 9.2 Dashboard Overview
- Show summary cards for:
  - total users
  - active users
  - total conversations
  - completed conversations
  - total FIR reports
  - FIR reports by status
- Display recent activity feed or latest events.
- Show system health indicator for backend availability.

### 9.3 User Management
- List users with fields such as email, full name, status, verification status, provider, and creation date.
- Search users by email or name.
- Filter users by status, provider, or verification state.
- View user profile details.
- Activate or deactivate user accounts.
- Toggle superuser privileges.
- View a user’s associated conversations and FIR reports.

### 9.4 Conversation Management
- List all conversations across users with pagination.
- Filter conversations by status, completion percentage, date, and user.
- Search by title, preview text, or message content.
- View full conversation detail including messages.
- Change conversation status such as active, completed, or archived.
- Delete or archive conversations when appropriate.

### 9.5 FIR Report Management
- List FIR reports with metadata such as FIR number, status, complainant, incident location, crime type, confidence score, and date.
- Search and filter FIR reports by status, user, date, or incident type.
- View full FIR details including extracted fields and legal sections.
- Review quality flags and confidence values.
- Update FIR status when required.

### 9.6 Audit and Security Logs
- Display audit log entries with action, user, resource, status, IP, user-agent, and timestamp.
- Filter by action type, user, status, and date range.
- Support investigation of login, password reset, FIR creation, and other sensitive events.

### 9.7 Export and Reporting
- Export users, conversations, FIR reports, and audit logs as CSV or JSON.
- Allow exporting a single FIR or conversation detail.

### 9.8 Notifications and Alerts
- Show warnings for low-confidence FIRs or suspicious activity patterns.
- Highlight failed or delayed operations where applicable.

## 10. Non-Functional Requirements
### Security
- Enforce role-based access control.
- Protect sensitive data from unauthorized access.
- Use secure handling of authentication tokens.
- Log admin actions for auditability.

### Performance
- Support paginated views for large datasets.
- Search and filter operations should respond quickly.
- The UI should remain responsive under normal production load.

### Usability
- Simple navigation with clear menu structure.
- Consistent visual design and status indicators.
- Search and filter controls should be easy to understand.

### Reliability
- The dashboard should display meaningful error states.
- Failure to load data should not crash the application.
- Token refresh behavior should remain seamless.

### Maintainability
- New admin features should be implemented using reusable components.
- Backend and frontend should follow the existing modular structure.

## 11. Technical and System Requirements
### Frontend
- React + TypeScript + Vite
- Reuse current design patterns from the existing app
- Add admin-specific pages and components

### Backend
- FastAPI admin endpoints should be added under a dedicated admin API namespace
- Existing auth dependency model should be reused for authorization
- Admin APIs should read from the existing PostgreSQL models for users, conversations, FIR reports, and audit logs

### Data Sources
- Users: existing user model
- Conversations: existing conversation and message models
- FIR reports: existing FIR report model
- Audit entries: existing audit log model

## 12. Suggested API Requirements
The dashboard will likely need new backend endpoints such as:
- GET /api/v1/admin/overview
- GET /api/v1/admin/users
- GET /api/v1/admin/users/{id}
- PATCH /api/v1/admin/users/{id}
- GET /api/v1/admin/conversations
- GET /api/v1/admin/conversations/{id}
- GET /api/v1/admin/fir-reports
- GET /api/v1/admin/fir-reports/{id}
- GET /api/v1/admin/audit-logs
- POST /api/v1/admin/export

## 13. UX Requirements
- Sidebar navigation with sections for Overview, Users, Conversations, FIR Reports, Audit Logs.
- Tables with sorting, filtering, and pagination.
- Detail drawers or modal views for inspecting records.
- Strong visual distinction between active, completed, archived, and rejected states.
- Accessible layout and readable typography.

## 14. Acceptance Criteria
The feature will be considered complete when:
- an admin can securely log in and access the dashboard,
- the dashboard shows summary metrics,
- users can be listed and filtered,
- conversations can be reviewed and managed,
- FIR reports can be inspected and filtered,
- audit logs can be viewed,
- the interface handles empty states and errors gracefully.

## 15. Implementation Phases
### Phase 1: Foundation
- Admin auth and route protection
- Dashboard shell and navigation
- Overview page

### Phase 2: Operations Management
- User management
- Conversation management
- FIR report management

### Phase 3: Monitoring and Governance
- Audit log viewing
- Export/reporting
- Quality and compliance signals

### Phase 4: Enhancements
- Advanced filters
- Bulk actions
- Analytics and trend visualizations

## 16. Risks and Mitigations
- **Risk**: Sensitive data exposure
  - **Mitigation**: enforce strict role-based access and data masking
- **Risk**: Large dataset performance issues
  - **Mitigation**: implement pagination and server-side filters
- **Risk**: Incomplete backend support
  - **Mitigation**: implement admin APIs in stages

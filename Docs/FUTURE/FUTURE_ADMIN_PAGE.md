# Future Admin Page — JayWiki

← Back to [FUTURE_IMPLEMENTATIONS.md](./FUTURE_IMPLEMENTATIONS.md)

A dedicated admin interface, separate from the standard student dashboard, for managing the JayWiki platform at a departmental level.

---

## Problem

Currently, admin-only actions (role assignment, course catalog management, event creation) are accessible via API but have no dedicated UI surface. Admins must either use the same dashboard as students or interact with the API directly.

---

## Goals

- Give admins a clearly separated interface that reflects their elevated permissions
- Surface management actions that are not relevant to students (user role changes, account merges, bulk operations)
- Make the platform maintainable by department staff post-handoff without requiring API access

---

## Proposed Features

### User Management
- View all registered users with role, provider, and registration date
- Promote/demote users between `student`, `instructor`, and `admin` roles
- Merge accounts (see item 2 in `FUTURE_IMPLEMENTATIONS.md`)
- Deactivate or delete accounts

### Course Catalog Management
- Full CRUD for `COURSE_CATALOG` entries in a dedicated table UI
- View which students are enrolled in each catalog entry
- Bulk import courses from a CSV or institutional data feed

### Event & Award Management
- Create, edit, and delete events
- Manage awards associated with events
- View registration lists per event

### Request Queue
- Review and action pending student requests (see `FUTURE_REQUEST_SYSTEM.md`)
- Approve, reject, or modify requested changes with an optional response message

### Analytics Overview
- Basic stats: total users, projects, courses, events by semester
- Connects naturally to Power BI Embedded (see `FUTURE_API_CONNECTIONS.md`)

---

## Technical Considerations

- Should be a separate lazy-loaded Angular route (e.g., `/admin`) with an `AdminGuard` that checks `currentUser.Role === 'admin'`
- Backend already enforces role checks at the API layer — the admin page is a UI concern only
- Consider a separate `AdminModule` or set of standalone components under `src/app/admin/`
- No new API endpoints required for most features — existing instructor/admin-gated endpoints cover the majority of actions

---

## Complexity

**High** — primarily a frontend effort. Most backend enforcement already exists.

---

*Last Updated: May 2026*
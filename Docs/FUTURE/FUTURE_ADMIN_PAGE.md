# Future Feature: Dedicated Admin Page

**Status:** Planned — not yet implemented  
**Target:** Post-v1.0 enhancement  
**Related roles:** Instructor / Admin only

---

## Overview

Currently, admin functionality (course catalog management, event management, and award management) is embedded as a panel in the right sidebar of the Dashboard. This works for an MVP but has limitations as the platform grows — the sidebar panel is space-constrained, difficult to extend, and mixes administrative concerns with personal portfolio content.

A future version should move all admin functionality to a **dedicated `/admin` page** accessible only to users with the `instructor` or `admin` role.

---

## Why a Separate Page

- **Space** — the sidebar panel is compact by design. Bulk operations, search, filtering, and pagination don't fit cleanly in a 300px sidebar.
- **Separation of concerns** — admin tools are platform management, not personal portfolio content. They don't belong on the same page as a user's profile.
- **Extensibility** — a dedicated page makes it much easier to add new admin sections (user management, request approval, analytics) without cluttering the dashboard.
- **Auditability** — a dedicated route makes it easier to gate, log, and control access separately from the dashboard.

---

## Proposed Route

```
/admin
```

Protected by `authGuard` + a role guard that redirects non-admins to `/dashboard`.

---

## Proposed Layout

Full-width page with a left sidebar for admin navigation and a main content area:

```
┌─────────────────────────────────────────────────────┐
│  Nav (JayWiki top bar)                               │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Admin Nav   │   Main Content Area                  │
│              │                                      │
│  📚 Courses  │   (selected section renders here)    │
│  📅 Events   │                                      │
│  🏆 Awards   │                                      │
│  👥 Users    │                                      │
│  📋 Requests │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

---

## Sections to Include

### Course Catalog
- Full searchable/filterable table of all catalog entries
- Inline edit and delete
- Bulk import (CSV upload)
- Add new entry form

### Events
- Full list with pagination
- Create, edit, delete
- View registrations per event
- Approve/reject event requests (see `FUTURE_REQUEST_SYSTEM.md`)

### Awards
- Full list with pagination
- Create, edit, delete
- Assign to users with optional event link
- Approve/reject award nominations (see `FUTURE_REQUEST_SYSTEM.md`)

### User Management *(not yet built)*
- List all users with role badges
- Promote/demote users between student, instructor, admin roles
- View user profiles and activity
- Deactivate accounts

### Pending Requests *(not yet built — see `FUTURE_REQUEST_SYSTEM.md`)*
- Unified inbox of pending event and award requests
- Approve or reject with optional reason
- Filter by type and status

---

## Migration Plan

When the dedicated admin page is built:

1. Create `features/admin/admin.ts` + `admin.html` with the full-width layout
2. Add the `/admin` route to `app.routes.ts` with `canActivate: [authGuard, adminGuard]`
3. Create `core/guards/admin.guard.ts` that checks `user.role === 'instructor' || user.role === 'admin'`
4. Move `AdminPanel` component logic into feature-specific sub-components under `features/admin/`
5. Remove `<app-admin-panel>` from `dashboard.html`
6. Add an "Admin" link to `nav.html` visible only to instructors/admins

---

## Nav Link

When the admin page exists, add a conditional link to the nav:

```html
<a *ngIf="auth.currentUser?.role === 'instructor' || auth.currentUser?.role === 'admin'"
   routerLink="/admin"
   class="...">
  Admin
</a>
```

---

**Last updated:** April 2026  
**Author:** JayWiki Development  
**See also:** `FUTURE_REQUEST_SYSTEM.md`, `LESSONS_LEARNED.md`

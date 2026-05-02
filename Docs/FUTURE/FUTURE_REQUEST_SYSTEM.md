# Future Request System — JayWiki

← Back to [FUTURE_IMPLEMENTATIONS.md](./FUTURE_IMPLEMENTATIONS.md)

A way for students and alumni to submit requests to admins through the application, covering additions or changes to courses, awards, and events that they cannot modify directly.

---

## Problem

Students and alumni currently have no way to contact admins or flag issues through JayWiki itself. If a student needs a course added to the catalog, an award recorded, or an event corrected, there is no in-app path to do so — they would need to reach out via email outside the system.

---

## Goals

- Give students a structured, in-app way to request changes they cannot make themselves
- Give admins a single queue to review, action, and respond to requests
- Reduce ad-hoc email back-and-forth between students and department staff

---

## Request Types

| Type | Example |
|------|---------|
| Course catalog addition | "CS490 — Senior Seminar isn't in the catalog" |
| Course catalog correction | "CS301 is listed under the wrong department" |
| Award addition | "I received an award at the Fall 2025 Showcase but it's not listed" |
| Event addition | "Club event from Spring 2025 is missing" |
| Account issue | "I have two accounts and need them merged" |
| Other | Free-text for anything not covered above |

---

## Proposed Flow

1. Student submits a request form in the app (type, description, optional reference IDs)
2. Request is stored in a new `REQUEST` table with status `pending`
3. Admin sees pending requests in the admin request queue (see `FUTURE_ADMIN_PAGE.md`)
4. Admin reviews and takes action: approve (and makes the change), reject, or request more info
5. Optional: notify the student in-app or via email when their request is resolved

---

## Schema Addition (Proposed)

```
REQUEST {
    int RequestId PK
    int UserId FK          -- submitting user
    string Type            -- "course_catalog" | "award" | "event" | "account" | "other"
    string Description     -- free-text details
    string Status          -- "pending" | "approved" | "rejected" | "info_needed"
    string AdminNote       -- optional response from admin
    DateTime SubmittedAt
    DateTime ResolvedAt    -- nullable
}
```

---

## Technical Considerations

- New `REQUEST` table and `RequestsController` required
- Students: `POST /api/requests` (create), `GET /api/requests/mine` (view own)
- Admins: `GET /api/requests` (all pending), `PUT /api/requests/{id}` (update status + note)
- Frontend: a simple "Submit a Request" form accessible from the dashboard, and a request history view
- Admin queue lives in the admin page (see `FUTURE_ADMIN_PAGE.md`)

---

## Complexity

**Medium** — new table and two controller endpoints; frontend form and admin queue view are straightforward.

---

*Last Updated: May 2026*
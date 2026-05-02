# Future Implementations — JayWiki

This document is the master index for all deferred features, edge cases, and planned enhancements beyond v1.0. Items complex enough to warrant their own planning docs are linked below.

---

## 1. Weird Use Cases

### A. Multiple Courses for a Single Project
- **Example:** Capstone projects that span multiple course enrollments (e.g., CS461 + CS462)
- **Current behavior:** `PROJECT` has a single nullable `CourseId` FK — only one course can be associated per project
- **Potential fix:** Replace `PROJECT.CourseId` with a `PROJECT_COURSE` junction table (many-to-many between PROJECT and COURSE)
- **Complexity:** Medium — requires a schema migration, updates to project create/edit forms, and updated API responses

### B. Multiple Projects for a Single Course
- **Example:** Software Engineering courses where each student or team submits several deliverables as separate projects
- **Current behavior:** Already supported — `PROJECT.CourseId` is not unique, so multiple projects can reference the same course enrollment
- **Potential issue:** Frontend may not clearly surface this; UI grouping of projects within a course view may need polish
- **Complexity:** Low — schema already allows it; mainly a frontend display concern

---

## 2. Multi-Email, Email Change, and Account Merge

- **Multi-email:** Allow users to associate multiple email addresses with one account beyond the current per-provider identity model
- **Email change:** Let users update the primary email on their account without unlinking their identity provider
- **Account merge:** If a student accidentally creates two separate accounts (e.g., one via Google, one via Microsoft with a different email), an admin should be able to combine them into a single record
- **Complexity:** Medium-High — account merge in particular requires careful handling of ownership transfers across Projects, Courses, Events, and other FK-linked records. See cascade notes in `DB_SCHEMA.md`

---

## 3. Student / Alumni Role Verification

- **Problem:** Users self-identify as students or alumni on registration, but there is no verification against an authoritative source
- **Potential fix:** Cross-reference registering users against a maintained catalog of current students and alumni (sourced from the department or Registrar) to automatically assign the correct role
- **Dependency:** Requires either a data feed from IT/Registrar or a manual admin-maintained roster
- **Complexity:** High — depends on institutional data access; Microsoft Graph API (see `FUTURE_API_CONNECTIONS.md`) may be a path forward for current students via Entra ID

---

## 4. Separate Admin Page

A dedicated admin interface, separate from the standard student dashboard, for managing users, roles, course catalog, events, and awards.

→ See: [FUTURE_ADMIN_PAGE.md](./FUTURE_ADMIN_PAGE.md)

---

## 5. Student Request System

A way for students and alumni to contact admins through the application to request additions or changes to courses, awards, and events — none of which students can currently modify directly.

→ See: [FUTURE_REQUEST_SYSTEM.md](./FUTURE_REQUEST_SYSTEM.md)

---

## 6. External API Connections

Planned integrations with external APIs to enrich the portfolio showcase and reduce manual data entry for students and instructors.

→ See: [FUTURE_API_CONNECTIONS.md](./FUTURE_API_CONNECTIONS.md)

---

## 7. Portfolio Export / PDF Generation

- **Use case:** Let students generate a shareable, printable PDF of their portfolio page (projects, courses, jobs, socials, awards)
- **Why it matters:** Tangible deliverable students would actually use for job applications and internship recruiting
- **Potential approach:** Server-side PDF generation (e.g., a headless browser or a library like PuppeteerSharp on the backend) triggered via a `GET /api/users/{id}/export/pdf` endpoint
- **Complexity:** Medium — PDF layout and styling is the main challenge; data is already available via existing endpoints

---

## 8. Email Notification System

- **Use case:** Notify students when they are added as a collaborator on a project, when an admin resolves their request, or when an event they registered for is updated or cancelled
- **Why it matters:** Currently there is no communication layer in the application — all changes are silent
- **Potential approach:** SendGrid or Azure Communication Services for email delivery; a `NOTIFICATION` table or a simple outbox pattern on the backend to queue messages
- **Complexity:** Medium — requires a new service layer and careful design around notification preferences (students should be able to opt out)

---

## 9. Project Visibility Controls

- **Use case:** Allow students to mark projects as `public`, `unlisted`, or `private` to control what appears on their public portfolio page
- **Why it matters:** Students may have in-progress or sensitive work they don't want publicly visible
- **Current state:** `PROJECT.Visibility` is already listed as a planned schema enhancement in `DB_SCHEMA.md` — the groundwork is noted
- **Complexity:** Low-Medium — schema addition is simple; the main work is updating all public-facing API queries to filter by visibility and surfacing the control in the project edit form

---

## 10. Alumni Role and Graduation Year

- **Use case:** Distinguish alumni from current students; add a `GraduationYear` field to `USER` so the platform remains useful after students graduate
- **Why it matters:** The current `Role` enum (`student` / `instructor` / `admin`) has no alumni state — graduated students have no distinct identity on the platform
- **Potential approach:** Add `alumni` as a role value and a nullable `GraduationYear` (int) field to `USER`; admins or an automated process could transition students to alumni after their graduation year passes
- **Complexity:** Low — schema change is minor; role logic updates are straightforward

---

## 11. Instructor Endorsements / Skills Verification

- **Use case:** Instructors can endorse a student's skills or confirm the quality of a project they supervised
- **Why it matters:** Adds credibility to the public showcase — a recruiter can see that a project was instructor-verified, not just self-reported
- **Potential approach:** A new `ENDORSEMENT` table linking an instructor `UserId` to a `ProjectId` or a `TOPIC` (skill tag), with an optional note; displayed as a badge on the project card
- **Complexity:** Medium — new schema, new endpoints, and frontend badge UI

---

## 12. Event Attendance / Check-In

- **Use case:** Mark actual attendance at an event, separate from registration
- **Why it matters:** Registration exists but there is no way to confirm who actually showed up — limits usefulness for department reporting and award tracking
- **Potential approach:** Add an `AttendedAt` (nullable DateTime) field to `EVENT_REGISTRATION`; admins can mark attendance via the admin page or a check-in code/QR flow
- **Complexity:** Low-Medium — schema change is minimal; a QR-based check-in flow would be the more complex stretch goal

---

## 13. Bulk Data Import for Admins

- **Use case:** Allow admins to import students, courses, or events from a CSV or Excel file instead of entering records one by one
- **Why it matters:** Practical for semester start when an instructor needs to populate the course catalog or pre-enroll a cohort
- **Potential approach:** Upload endpoint accepting `.csv` or `.xlsx`; parse with a library (e.g., EPPlus for Excel on the backend); validate and insert in bulk with clear error reporting for bad rows
- **Complexity:** Medium — file parsing and row-level validation/error reporting are the main challenges; Excel support adds some overhead over CSV-only

---

## 14. Project Comments / Feedback

- **Use case:** Instructors or collaborators can leave comments on a project as an annotation layer for feedback or discussion
- **Why it matters:** Currently there is no way to attach feedback to a project within the application; pairs naturally with instructor endorsements (#11)
- **Potential approach:** A new `PROJECT_COMMENT` table (ProjectId, UserId, Body, CreatedAt); displayed as a thread on the project detail page; restricted to authenticated users, editable/deletable by the author
- **Complexity:** Medium — straightforward schema and endpoints; main consideration is whether comments are public-facing or visible only to the owner and collaborators

---

## 15. Course Completion and Outcome Tracking

- **Use case:** Allow students to mark a course enrollment as completed and optionally add a short reflection or outcome (e.g., "Built a compiler, presented at ECS Showcase")
- **Why it matters:** Currently enrollments have no completion state — the portfolio view has no way to distinguish active courses from finished ones, or to surface what a student took away from a course
- **Note:** Intentionally excludes grades — outcome is self-reported and qualitative, not academic record-keeping
- **Potential approach:** Add `CompletedAt` (nullable DateTime) and `Outcome` (nullable string) to `COURSE`; surface as a toggle + optional text field in the course edit form
- **Complexity:** Low — minor schema addition; straightforward frontend change

---

## 16. Event Capacity Limits

- **Use case:** Cap registration for an event at a maximum number of participants; prevent sign-ups once full
- **Current state:** `EVENT.MaxParticipants` (nullable int) is already listed as a planned schema enhancement in `DB_SCHEMA.md`
- **Potential approach:** Check current registration count against `MaxParticipants` before allowing a new `EVENT_REGISTRATION` insert; surface remaining capacity on the event card
- **Complexity:** Low — schema change already designed; backend check and frontend display are straightforward

---

## 17. Student Profile Bio

- **Use case:** A short free-text biography on each student's public profile page
- **Current state:** `USER.Bio` (nullable string) is already listed as a planned schema enhancement in `DB_SCHEMA.md`
- **Why it matters:** Makes the public showcase feel like a real portfolio rather than just a data listing; useful for recruiters landing on a student's page
- **Complexity:** Low — schema addition already designed; add a textarea to the profile edit form and render on the public profile page

---

## 18. Dark / Light Mode Toggle

- **Use case:** Let users switch between the current dark navy theme and a light mode alternative
- **Why it matters:** Low effort, high perceived polish for a public-facing showcase; improves accessibility and user preference coverage
- **Potential approach:** Tailwind's `dark:` variant with a class toggle on `<html>`; persist preference in `localStorage`
- **Complexity:** Low — Tailwind makes this straightforward; main effort is auditing all existing components for correct `dark:` overrides

---

## 19. Sitemap and SEO Metadata

- **Use case:** Add proper `<meta>` tags (Open Graph, description, title) to public-facing pages and generate a sitemap for search engine indexing
- **Why it matters:** If recruiters and faculty are meant to find students through JayWiki, the public pages need to be discoverable — Angular SPAs are not indexed well by default without this
- **Potential approach:** Angular `Meta` and `Title` services for per-page metadata; a server-rendered or pre-rendered sitemap at `/sitemap.xml` listing all public student and project pages
- **Complexity:** Low-Medium — meta tags are straightforward; sitemap generation requires either SSR or a backend endpoint that queries all public records

---

## 20. Department Stats and Comparison Dashboard

- **Use case:** Anonymized analytics showing tech stack adoption trends, project counts by semester, most common topics, and event participation across the ECS department
- **Why it matters:** Gives department heads and faculty a high-level view of student output; useful for accreditation reporting and showcasing program health
- **Potential approach:** A dedicated stats page powered by aggregated API queries; could integrate with Power BI Embedded (see `FUTURE_API_CONNECTIONS.md`) or be built as a custom Angular dashboard with charts
- **Complexity:** Medium — data is already in the database; the work is aggregation queries, a stats API layer, and the dashboard UI

---

*Last Updated: May 2026*
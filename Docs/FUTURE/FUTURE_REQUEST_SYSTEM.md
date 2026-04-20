# Future Feature: Event & Award Request System

**Status:** Planned — not yet implemented  
**Target:** Post-v1.0 enhancement  
**Related roles:** All users (submitters), Instructor / Admin (approvers)

---

## Overview

Currently, only instructors and admins can create events and assign awards directly through the Admin Panel. A future version will introduce a **request/approval workflow** that allows any authenticated user to submit a request for a new event or award, which an admin then reviews and approves or rejects.

---

## Proposed Flow

### Submitting a Request (All Users)
- A **"Request an Event"** button on the Events page
- A **"Nominate for Award"** button on the Awards section of the dashboard and student profiles
- Users fill out a form with the relevant details (see schema below)
- Request is saved with status `pending` and is visible to the submitter

### Review (Instructor / Admin)
- Admin Panel shows a **Pending Requests** section with all outstanding submissions
- Admin can **Approve** (automatically creates the Event or Award in the real tables) or **Reject** (with an optional rejection reason)
- Only admins can **delete** approved events and awards

### Post-Decision Visibility
- Submitter can see the status of their request (`pending`, `approved`, `rejected`) on their dashboard
- Rejection reason (if provided) is visible to the submitter
- Approved requests link to the created Event or Award

---

## Database Schema

### New Table: `EVENT_REQUEST`

| Column | Type | Notes |
|--------|------|-------|
| `EventRequestId` | int PK | Auto-increment |
| `SubmittedByUserId` | int FK → USER | Required |
| `Status` | string | `pending` / `approved` / `rejected` |
| `Title` | string | Required |
| `Description` | string | Optional |
| `Category` | string | `club` / `sport` / `academic` / `other` |
| `ProposedDate` | DateTime | Required |
| `RejectionReason` | string | Optional — set on rejection |
| `ReviewedByUserId` | int FK → USER | Null until reviewed |
| `ReviewedAt` | DateTime | Null until reviewed |
| `ApprovedEventId` | int FK → EVENT | Null until approved |
| `SubmittedAt` | DateTime | Auto UTC |

### New Table: `AWARD_REQUEST`

| Column | Type | Notes |
|--------|------|-------|
| `AwardRequestId` | int PK | Auto-increment |
| `SubmittedByUserId` | int FK → USER | Required |
| `RecipientUserId` | int FK → USER | Required — who the award is for |
| `Status` | string | `pending` / `approved` / `rejected` |
| `Title` | string | Required |
| `Description` | string | Optional |
| `LinkedEventId` | int FK → EVENT | Optional |
| `RejectionReason` | string | Optional |
| `ReviewedByUserId` | int FK → USER | Null until reviewed |
| `ReviewedAt` | DateTime | Null until reviewed |
| `ApprovedAwardId` | int FK → AWARD | Null until approved |
| `SubmittedAt` | DateTime | Auto UTC |

---

## API Endpoints

### Event Requests
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/event-requests` | Authenticated | Submit a new event request |
| GET | `/api/event-requests` | Instructor/Admin | List all requests (filterable by status) |
| GET | `/api/event-requests/mine` | Authenticated | List own submissions |
| PUT | `/api/event-requests/{id}/approve` | Instructor/Admin | Approve — creates Event automatically |
| PUT | `/api/event-requests/{id}/reject` | Instructor/Admin | Reject with optional reason |
| PUT | `/api/event-requests/{id}` | Submitter (pending only) | Edit own pending request |
| DELETE | `/api/event-requests/{id}` | Submitter (pending only) | Withdraw own pending request |

### Award Requests
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/award-requests` | Authenticated | Submit a new award nomination |
| GET | `/api/award-requests` | Instructor/Admin | List all requests (filterable by status) |
| GET | `/api/award-requests/mine` | Authenticated | List own submissions |
| PUT | `/api/award-requests/{id}/approve` | Instructor/Admin | Approve — creates Award automatically |
| PUT | `/api/award-requests/{id}/reject` | Instructor/Admin | Reject with optional reason |
| PUT | `/api/award-requests/{id}` | Submitter (pending only) | Edit own pending request |
| DELETE | `/api/award-requests/{id}` | Submitter (pending only) | Withdraw own pending request |

---

## Frontend Changes

### For All Users
- **Events page** — "Request an Event" button opens a submission form
- **Dashboard Awards section** — "Nominate for Award" button opens a nomination form
- **Student profile** — "Nominate for Award" button visible on other users' profiles
- **My Dashboard** — new "My Requests" section showing submitted requests with status badges

### For Instructors / Admins
- **Admin Panel** — new "Pending Requests" section with approve/reject controls for both event and award requests
- Approved requests auto-populate the Events and Awards sections immediately

---

## Business Rules

- Users may only edit or withdraw their own requests while status is `pending`
- Approving a request creates the canonical Event or Award record — the request itself is kept for audit purposes
- Rejecting a request does not delete it — it remains visible to the submitter with the rejection reason
- Admins retain sole delete authority over approved Events and Awards
- A single user may not submit duplicate pending requests for the same event title within 30 days (duplicate check at application layer)

---

## Implementation Order (When Ready)

1. Add `EVENT_REQUEST` and `AWARD_REQUEST` models and EF migration
2. Build `EventRequestsController` and `AwardRequestsController`
3. Add "My Requests" section to dashboard
4. Add submission forms to Events page and student profiles
5. Add "Pending Requests" section to Admin Panel
6. Add approve/reject logic that auto-creates Event/Award on approval

---

**Last updated:** April 2026  
**Author:** JayWiki Development  
**See also:** `LESSONS_LEARNED.md`, `DB_SCHEMA.md`

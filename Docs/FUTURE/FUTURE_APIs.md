# Future API Connections — JayWiki

This document tracks external API integrations worth pursuing in future development cycles. Ordered by priority and impact.

---

## Most Impactful — Core Portfolio Features

### GitHub API
- **Use case:** Auto-sync repo stats (stars, last commit, languages used) directly onto project cards
- **Why it matters:** Students wouldn't need to manually update projects; could also auto-populate topics from repo languages
- **Priority:** High — directly enriches the core feature (project showcase) with live data and reduces manual student effort, which matters for long-term adoption after handoff

### LinkedIn API
- **Use case:** Let students import job and education history instead of entering it manually
- **Why it matters:** Useful for post-grad handoff — students can link their profile so recruiters browsing the showcase can find them directly
- **Priority:** High

### Google Scholar / Semantic Scholar API
- **Use case:** For research-focused projects, pull in citation counts or published paper metadata automatically
- **Why it matters:** Especially valuable for an engineering school showcase where faculty and students publish research
- **Priority:** Medium

---

## Useful for the Departmental Side

### Microsoft Graph API
- **Use case:** Pull course roster data, faculty info, or calendar events directly from the institution via Entra ID
- **Why it matters:** Since the school uses Entra ID, this is a natural fit — makes the Events feature much more useful and reduces duplicate data entry for instructors
- **Notes:** Already noted as a planned enhancement in `techstack.md`
- **Priority:** Medium

### Power BI Embedded
- **Use case:** Analytics dashboard for department heads — project counts by semester, tech stack trends, student activity, etc.
- **Why it matters:** High "professional impression" value for the departmental handoff
- **Notes:** Already noted as a planned enhancement in `techstack.md`
- **Priority:** Medium

---

## Nice-to-Have — Polish

### Gravatar API
- **Use case:** Fallback profile images for users who haven't uploaded one
- **Why it matters:** Zero setup for students; no blank avatars in the public showcase
- **Priority:** Low

### Open Graph / Link Preview API (e.g., Microlink)
- **Use case:** When students add a `DemoUrl` or `GithubUrl`, render a rich preview card instead of a bare link
- **Why it matters:** Makes project cards feel more professional and informative at a glance
- **Priority:** Low

---

## APIs to Skip

| API | Reason |
|-----|--------|
| Slack / Jira / Asana | No clear campus use case |
| Twitter / X API | Expensive and unreliable |
| Canvas / Blackboard (LMS) | School IT would likely block, same as B2C |

---

*Last Updated: May 2026*
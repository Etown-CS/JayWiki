// frontend/src/app/core/models/models.ts
// Shared interfaces used across all feature components

export interface User {
  userId: number;
  name: string;
  role: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  primaryEmail?: string;
}

export interface Social {
  socialId: number;
  userId: number;
  platform: string;
  url: string;
  username?: string;
  verified: boolean;
}

export interface Topic {
  topicId: number;
  name: string;
}

export interface Collaborator {
  projectCollaboratorId: number;
  userId: number;
  name: string;
  email?: string;
}

export interface ProjectMedia {
  projectMediaId: number;
  projectId?: number;
  mediaType: string; // 'image' | 'video' | 'link'
  url: string;
}

export interface CourseRef {
  courseId: number;
  courseCode: string;
  courseName: string;
  semester: string;
  year: number;
  instructor?: string;
}

export interface Project {
  projectId: number;
  userId: number;
  title: string;
  description?: string;
  projectType: string; // 'academic' | 'research' | 'club' | 'personal'
  status: string;      // 'active' | 'completed' | 'archived'
  startDate?: string;
  endDate?: string;
  githubUrl?: string;
  demoUrl?: string;
  course?: CourseRef | null;
  topics?: Topic[];
  collaborators?: Collaborator[];
  media?: ProjectMedia[];
}

export interface CourseEnrollment {
  courseId: number;
  userId: number;
  catalogId: number;
  semester: string;
  year: number;
  instructor?: string;
  course: {
    catalogId: number;
    courseCode: string;
    courseName: string;
    department?: string;
    credits?: number;
  };
  student: {
    userId: number;
    name: string;
    profileImageUrl?: string;
  };
  projects: Project[];
}

export interface CourseCatalog {
  catalogId: number;
  courseCode: string;
  courseName: string;
  department?: string;
  credits?: number;
  description?: string;
  createdByUserId?: number;
}

// ── Event interfaces ──────────────────────────────────────────────────────────

export interface EventRegistration {
  eventRegistrationId: number;
  eventId: number;
  userId: number;
  name: string;
  profileImageUrl?: string;
  registeredAt: string;
}

export interface Award {
  awardId: number;
  eventId: number;
  title: string;
  description?: string;
  awardedAt: string;
}

export interface EventMedia {
  eventMediaId: number;
  eventId: number;
  mediaType: string; // 'image' | 'video' | 'link'
  url: string;
}

export interface EventDetail {
  eventId: number;
  title: string;
  description?: string;
  category: string;
  eventDate: string;
  registrations: EventRegistration[];
  media: EventMedia[];
  awards: Award[];
}

export interface EventSummary {
  eventId: number;
  title: string;
  description?: string;
  category: string;
  eventDate: string;
}
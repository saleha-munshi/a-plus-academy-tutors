export type Role = 'owner' | 'tutor' | 'student';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  assignedTutorId?: string;
  subjects?: string[];
  createdAt: string;
}

export type GradeLevel = 'gcse' | 'a-level';
export type ResourceType = 'subject-notes' | 'homework';

export interface Resource {
  id: string;
  title: string;
  gradeLevel: GradeLevel;
  subject: string;
  topic: string;
  resourceType: ResourceType;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
}

export interface TestQuestion {
  id: string;
  questionText: string;
  options: string[]; // length 4
  correctAnswerIndex?: number; // omitted for students
}

export interface Test {
  id: string;
  title: string;
  gradeLevel: GradeLevel;
  subject: string;
  topic: string;
  questions: TestQuestion[];
  createdBy?: string;
  createdAt?: string;
}

export type AssignmentItemType = 'resource' | 'test';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed';

export interface Assignment {
  id: string;
  studentId: string;
  itemId: string;
  itemType: AssignmentItemType;
  assignedBy: string;
  assignedAt: string;
  status: AssignmentStatus;
}

export interface ProgressRecord {
  id: string;
  studentId: string;
  resourceId: string;
  status: 'unread' | 'read';
  readAt?: string;
}

export interface TestResult {
  id: string;
  studentId: string;
  testId: string;
  answers: number[];
  correctCount: number;
  totalQuestions: number;
  score: number;
  completedAt: string;
}

export type MeetingStatus = 'pending' | 'confirmed' | 'student_proposed' | 'declined';

export interface Meeting {
  id: string;
  title: string;
  tutorId: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  start: string;
  end: string;
  meetLink: string;
  notes?: string;
  status: MeetingStatus;
  proposedStart?: string;
  proposedEnd?: string;
  proposalNotes?: string;
  createdAt: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  createdAt: string;
}

export interface Application {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status: 'pending' | 'onboarded' | 'rejected';
  submittedAt: string;
}

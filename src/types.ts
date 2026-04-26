export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  EMPLOYEE = 'employee',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

export enum ITRole {
  BACKEND = 'Backend Developer',
  FRONTEND = 'Frontend Developer',
  FULLSTACK = 'Fullstack Developer',
  UIUX = 'UI/UX Designer',
  QA = 'QA Engineer',
  DEVOPS = 'DevOps Engineer',
  DATA_SCIENTIST = 'Data Scientist',
  PROJECT_MANAGER = 'Project Manager',
  SYS_ADMIN = 'System Administrator',
  SECURITY = 'Security Analyst',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  itRole?: ITRole;
  managedBy?: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User ID
  assignedToName?: string;
  assignedBy: string; // User ID
  assignedByName?: string;
  status: TaskStatus;
  deadline: string;
  rating?: number;
  workSubmission?: string;
  workFileName?: string;
  workFileData?: string;
  createdAt: string;
  updatedAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

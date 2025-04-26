export interface UserAccount {
  id: number;
  user_id: string;
  fullname: string;
  username: string;
  age: number | null;
  upid: number;
  created_at: string;
  updated_at: string;
  suspended: boolean;
  comments?: string;
}

export interface NewUser {
  fullname: string;
  username: string;
  age: number | null;
  upid: number;
  email: string;
  password: string;
}

export interface ParentChildRelationship {
  parent: string;
  child: string;
}

export interface RelationshipData {
  parent_id: string;
  child_id: string;
  parent: {
    username: string;
    fullname: string;
  };
  child: {
    username: string;
    fullname: string;
  };
}

export interface ClassroomData {
  crid: number;
  name: string;
  description: string;
  educatorName: string;
  students: {
    username: string;
    fullname: string;
    invitation_status: string;
  }[];
}

export interface StudentData {
  invitation_status: string;
  user_account: {
    username: string;
    fullname: string;
  };
}

export interface ClassroomWithStudents {
  crid: number;
  name: string;
  description: string;
  uaid_educator: string;
}

export interface DiscussionEntry {
  id: number;
  message: string;
  sender_name: string;
  created_at: string;
}

export interface DiscussionData {
  classroomName: string;
  teacherQuestion: string;
  responses: DiscussionEntry[];
}

export interface EditingCell {
  username: string;
  field: string;
  value: string | number;
}

export interface UserDetailsModalProps {
  user: UserAccount;
  onClose: () => void;
  onStatusClick: (user: UserAccount) => void;
  onEdit: (username: string, field: string, value: string | number) => Promise<void>;
  onDelete: (user: UserAccount) => void;
  onResetPassword: (user: UserAccount) => void;
  userTypes: { id: number; label: string }[];
  getUpidLabel: (upid: number) => string;
}

export interface UserType {
  id: number;
  label: string;
} 
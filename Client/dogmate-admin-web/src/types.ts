export type Role = 'admin' | 'owner' | 'walker' | string;

export interface LoginResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
  suspended?: boolean;
  userRole?: Role;
}

export interface UserRow {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  type?: 'AdminUser' | 'RegularUser' | 'DogWalkerUser' | string;
  permissionLevel?: string;
  suspended?: boolean;
}

export interface DogRow {
  id: string;
  name: string;
  breed: string;
  gender?: 'M' | 'F' | string;
  birthdate?: string;
  users_related?: string[];
}

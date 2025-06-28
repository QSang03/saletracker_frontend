// types/index.ts
export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

export interface Department {
  id?: number;
  name: string;
}

export interface Permission {
  id: number;
  action: string;
}

export interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: "active" | "inactive";
  roles: Role[];
  department?: Department;
  permissions?: Permission[];
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

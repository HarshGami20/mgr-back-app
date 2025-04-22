// src/types/custom.d.ts

export type UserRole = "super_admin" | "admin" | "sales_person" | "worker";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface PhotoWithComment {
  photo: string | null;
  comment: string;
}

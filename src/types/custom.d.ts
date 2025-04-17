// src/types/custom.d.ts
import { Request } from "express";

// Define a User interface to match the expected structure
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;  // or whatever type your 'role' is
}

// Extend the Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: User;  // Optional user property on the request
    }
  }
}

// import { Request, Response, NextFunction } from "express";

// // Assuming your User interface is more detailed
// interface User {
//   id: string;  // or number, depending on your model
//   role: string;
//   username: string;
//   email: string;
//   // Add other properties you need
// }

// export const requireRole = (roles: string[]) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     const user = req.user as User;  // Type-casting req.user to User

//     if (!user || !roles.includes(user.role)) {
//       return res.status(403).json({ message: "Access denied" });
//     }
//     next();
//   };
// };


import { Request, Response, NextFunction } from "express";
import { User } from "../types/custom";  // Import the User type

// Using the Role enum from Prisma
export enum Role {
  super_admin = "super_admin",
  admin = "admin",
  sales_person = "sales_person",
  worker = "worker",
}

export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;  // Type-cast req.user to User

    if (!user || !roles.includes(user.role as Role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

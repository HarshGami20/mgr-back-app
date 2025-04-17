// // import jwt from "jsonwebtoken";
// // import { Request } from "express";

// // const JWT_SECRET = process.env.JWT_SECRET!;

// // export const generateToken = (user) => {
// //   return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
// // };

// // export const getUserFromToken = (req: Request) => {
// //   const auth = req.headers.authorization;
// //   if (!auth) return null;
// //   try {
// //     const token = auth.split(" ")[1];
// //     return jwt.verify(token, JWT_SECRET);
// //   } catch {
// //     return null;
// //   }
// // };


// import jwt from "jsonwebtoken";
// import { Request } from "express";
// import { User } from "../types/custom";  // Import the User type

// // Define the User interface with properties you expect from your user object
// // interface User {
// //   id: string;
// //   role: string;
// //   // Add other properties if necessary (e.g., name, email)
// // }

// const JWT_SECRET = process.env.JWT_SECRET!;

// // Function to generate JWT token
// export const generateToken = (user: User): string => {
//   return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
// };

// // Function to get user from the JWT token in the request headers
// export const getUserFromToken = (req: Request): User | null => {
//   const auth = req.headers.authorization;
//   if (!auth) return null;

//   try {
//     const token = auth.split(" ")[1];
//     // Verify the token and return the decoded user data
//     const decoded = jwt.verify(token, JWT_SECRET) as User;  // Type-cast the decoded object to match the User interface
//     return decoded;
//   } catch {
//     return null;
//   }
// };


// // import { Request } from "express";

// // export const getUserFromToken = (req: Request): User | null => {
// //   // Your logic to extract the user from the token (e.g., decoding a JWT)
// //   const user = { id: "123", name: "John Doe", email: "john@example.com", role: "admin" }; // Example
// //   return user || null;  // Return user or null if not found
// // };


// utils/auth.ts

import jwt from "jsonwebtoken";
import { Request } from "express";
import { User } from "../types/custom";


export const generateToken = (user: User): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

export const getUserFromToken = (req: Request): User | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;
    return decoded;
  } catch (err) {
    return null;
  }
};


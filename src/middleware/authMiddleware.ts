// // import { getUserFromToken } from "../utils/auth";

// // export const authMiddleware = (req, res, next) => {
// //   const user = getUserFromToken(req);
// //   if (!user) return res.status(401).json({ message: "Unauthorized" });
// //   req.user = user;
// //   next();
// // };



// // import { Request, Response, NextFunction } from "express";  // Import types
// // import { generateToken } from "../utils/auth";  // Assuming you have this utility function

// // export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
// //   const user = generateToken(req);  // Your logic to extract the user from the token
// //   if (!user) return res.status(401).json({ message: "Unauthorized" });
// //   req.user = user;  // Attach the user to the request object
// //   next();  // Proceed to the next middleware or route handler
// // };


// // import { Request, Response, NextFunction } from "express";
// // import { getUserFromToken } from "../utils/auth";

// // // Middleware to check if user is authenticated
// // export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
// //   const user = getUserFromToken(req);  // Get user from the token
  
// //   if (!user) {
// //     return res.status(401).json({ message: "Unauthorized" });
// //   }
  
// //   req.user = user;  // Attach user to the request object
// //   next();  // Pass control to the next middleware or route handler
// // };


// import { Request, Response, NextFunction } from "express";  // Import types
// import { getUserFromToken } from "../utils/auth";  // Assuming you have this utility function

// // Extend the Request interface to include the `user` property
// declare global {
//   namespace Express {
//     interface Request {
//       user?: any;  // Replace 'any' with your actual user type if available
//     }
//   }
// }

// export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
//   const user = getUserFromToken(req);  // Your logic to extract the user from the token
//   if (!user) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }
//   req.user = user;  // Attach the user to the request object
//   next();  // Proceed to the next middleware or route handler
// };


// // import { Request, Response, NextFunction } from "express";  // Import types
// // import { getUserFromToken } from "../utils/auth";  // Assuming you have this utility function

// // // Define the User type (you can extend this interface as needed)
// // interface User {
// //   id: string;
// //   role: string;
// //   // Add other properties like email, name, etc.
// // }

// // // Extend the Request interface to include the `user` property
// // declare global {
// //   namespace Express {
// //     interface Request {
// //       user?: User;  // Attach the `user` property to the `Request` interface
// //     }
// //   }
// // }

// // export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
// //   const user = getUserFromToken(req);  // Extract user from token
// //   if (!user) {
// //     return res.status(401).json({ message: "Unauthorized" });
// //   }
// //   req.user = user;  // Attach user to the request object
// //   next();  // Proceed to the next middleware or route handler
// // };


// middleware/authMiddleware.ts

import { Request, Response, NextFunction } from "express";
import { getUserFromToken } from "../utils/auth";  // Your utility
import { User } from "../types/custom";            // Your User type

export const authMiddleware = (req: Request, res: Response, next: NextFunction): any => {
  try {
    const user: User | null = getUserFromToken(req);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};


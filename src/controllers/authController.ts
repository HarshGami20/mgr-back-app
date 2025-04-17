// import bcrypt from "bcryptjs";
// import prisma from "../prisma";
// import { generateToken } from "../utils/auth";
// import { Request, Response } from "express"; 

// export const register = async (req: Request, res: Response) => {
//   const { name, email, password, role } = req.body;
//   const hashed = await bcrypt.hash(password, 10);
//   const user = await prisma.user.create({
//     data: { name, email, password: hashed, role },
//   });
//   res.json({ user, token: generateToken(user) });
// };

// export const login = async (req: Request, res: Response) => {
//   const { email, password } = req.body;
//   const user = await prisma.user.findUnique({ where: { email } });
//   if (!user || !(await bcrypt.compare(password, user.password))) {
//     return res.status(401).json({ message: "Invalid credentials" });
//   }
//   res.json({ user, token: generateToken(user) });
// };




import bcrypt from "bcryptjs";
import { generateToken } from "../utils/auth";
import { Request, Response } from "express";
import { User } from "../types/custom";
import { prisma } from "../prisma";

// export const register = async (req: Request, res: Response): Promise<Response | any> => {
//   const { name, email, password, role } = req.body;

//   try {
//     const existingUser = await prisma.user.findUnique({ where: { email } });
//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     const hashed = await bcrypt.hash(password, 10);

//     const user = await prisma.user.create({
//       data: { name, email, password: hashed, role },
//     });

//     const token = generateToken(user);

//     return res.status(201).json({
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//       token,
//     });
//   } catch (error) {
//     console.error("Registration Error:", error);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };


export const register = async (req: Request, res: Response): Promise<Response | any> => {
  const { name, email, password, role } = req.body;

  // const user: User = req.user as User;


  // if (!user || user.role !== "super_admin") {
  //   return res.status(403).json({ message: "Only super_admin can update passwords." });
  // }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    });

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req: Request, res: Response): Promise<Response | any> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    } 

    const token = generateToken(user);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updatePassword = async (req: Request, res: Response): Promise<Response> => {
  const user: User = req.user as User;


  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ message: "Only super_admin can update passwords." });
  }

  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ message: "userId and newPassword are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return res.status(200).json({ message: `Password updated for ${user.email}` });
  } catch (error) {
    console.error("Update Password Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
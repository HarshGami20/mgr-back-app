// controllers/userController.ts
import { Request, Response } from 'express';
import { User } from '../types/custom';
import { prisma } from '../prisma';




// Get all users (SUPER_admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<Response | any> => {
  const currentUser = req.user  as User;

  if (currentUser.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only SUPER_admin can view all users' });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};



export const updateUserRole = async (req: Request, res: Response): Promise<Response | any> => {
  const { id } = req.params;
  const { role } = req.body;
  const currentUser = req.user as User;

  if (currentUser.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only SUPER_admin can assign roles' });
  }

  if (!['admin', 'sales_person', 'worker'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    res.json({ message: `Role updated to ${role}`, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};
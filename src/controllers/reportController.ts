
import { Request, Response } from "express";
import { User } from "../types/custom";  
import { handleError } from "../utils/errorHandler";  
import { prisma } from "../prisma";

export const getReports = async (req: Request, res: Response): Promise<Response | any> => {
  const user = req.user as User; 

  if (!user || !["admin", "super_admin"].includes(user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const totalOrders = await prisma.order.count();
    const totalAmount = await prisma.order.aggregate({
      _sum: { totalAmount: true },
    });

    return res.json({
      totalOrders,  
      totalSales: totalAmount._sum.totalAmount ?? 0,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return handleError(res, error);
  }
};

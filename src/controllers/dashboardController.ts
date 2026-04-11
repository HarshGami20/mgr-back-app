import { Request, Response } from "express";
import { prisma } from "../prisma";
import { getUserFromToken } from "../utils/auth";
import { handleError } from "../utils/errorHandler";
import { orderLinesInclude } from "../utils/orderLineSync";

const DELIVERED = "Delivered";

/**
 * Admin overview: order counts + 5 most recent orders (no full-table list fetch).
 */
export async function getAdminOrdersDashboard(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [delivered, open, recentOrders] = await prisma.$transaction([
      prisma.order.count({ where: { orderStatus: DELIVERED } }),
      prisma.order.count({ where: { orderStatus: { not: DELIVERED } } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { createdBy: true, ...orderLinesInclude },
      }),
    ]);

    res.json({
      orderStats: { open, delivered },
      recentOrders,
    });
  } catch (error: unknown) {
    console.error("getAdminOrdersDashboard", error);
    handleError(res, error);
  }
}

/**
 * "My orders" overview: totals for orders created by this user (same scope as GET /myorders).
 * Uses DB aggregation instead of loading large order lists on the client.
 */
export async function getMyOrdersDashboard(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = getUserFromToken(req) as { id: string };
    const userId = user.id;

    const rows = await prisma.$queryRaw<{ total: bigint; open: bigint }[]>`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN \`orderStatus\` <> ${DELIVERED} THEN 1 ELSE 0 END), 0) AS \`open\`
      FROM \`Order\`
      WHERE \`createdById\` = ${userId}
    `;

    const row = rows[0];
    const total = row ? Number(row.total) : 0;
    const open = row ? Number(row.open) : 0;

    res.json({ total, open });
  } catch (error: unknown) {
    console.error("getMyOrdersDashboard", error);
    handleError(res, error);
  }
}

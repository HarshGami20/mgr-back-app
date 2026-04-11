import type { Prisma } from "@prisma/client";

/** Merge with `createdBy` in each handler — lines + variant + parent product for list APIs. */
export const orderLinesInclude = {
  orderLines: {
    include: {
      productVariant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              subcategory: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

/** For GET /order/:id — full line + variant + product for detail screens. */
export const orderDetailInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
  payments: true,
  orderLines: {
    include: {
      productVariant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              subcategory: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderLineInput = {
  productVariantId: string;
  quantity: number;
  unitPrice?: number;
};

export function parseOrderLineInputs(body: Record<string, unknown>): OrderLineInput[] {
  const raw = body.orderLines ?? body.lineItems;
  if (raw == null || raw === "") return [];
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);
  try {
    const parsed = JSON.parse(str) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: OrderLineInput[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const productVariantId =
        o.productVariantId != null
          ? String(o.productVariantId)
          : o.productId != null
            ? String(o.productId)
            : "";
      const quantity = Math.floor(Number(o.quantity));
      if (!productVariantId || quantity < 1) continue;
      const unitPrice = o.unitPrice != null ? Number(o.unitPrice) : undefined;
      out.push({
        productVariantId,
        quantity,
        unitPrice: unitPrice != null && !Number.isNaN(unitPrice) ? unitPrice : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function replaceOrderLines(
  tx: Prisma.TransactionClient,
  orderId: number,
  lines: OrderLineInput[]
): Promise<void> {
  await tx.orderLine.deleteMany({ where: { orderId } });
  for (const line of lines) {
    const v = await tx.productVariant.findUnique({
      where: { id: line.productVariantId },
      include: { product: true },
    });
    if (!v) {
      throw new Error(`Unknown product variant: ${line.productVariantId}`);
    }
    const unit = line.unitPrice ?? v.unitPrice ?? 0;
    await tx.orderLine.create({
      data: {
        orderId,
        productVariantId: v.id,
        quantity: line.quantity,
        unitPrice: unit,
        productName: v.product.name,
        sku: v.sku,
      },
    });
  }
}

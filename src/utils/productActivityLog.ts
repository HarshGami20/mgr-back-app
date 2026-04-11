import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export async function recordProductActivity(input: {
  productId: string;
  action: string;
  message: string;
  payload?: Prisma.InputJsonValue;
  actorUserId?: string;
  actorName?: string;
}): Promise<void> {
  await prisma.productActivity.create({
    data: {
      productId: input.productId,
      action: input.action,
      message: input.message,
      payload: input.payload,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
    },
  });
}

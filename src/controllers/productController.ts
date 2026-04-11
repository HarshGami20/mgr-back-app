import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { handleError } from "../utils/errorHandler";
import { recordProductActivity } from "../utils/productActivityLog";

const variantInclude = {
  variants: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.ProductInclude;

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const j = JSON.parse(val);
      return Array.isArray(j) ? j.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

type VariantBody = {
  id?: string;
  sku: string;
  label?: string;
  size: string;
  material: string;
  color: string;
  model: string;
  unitPrice?: number | null;
  stockQuantity?: number;
  imageUris?: unknown;
  isDefault?: boolean;
  sortOrder?: number;
};

function parseVariant(b: Record<string, unknown>): VariantBody | null {
  const sku = String(b.sku || "").trim();
  if (!sku) return null;
  return {
    id: b.id != null ? String(b.id) : undefined,
    sku,
    label: b.label != null ? String(b.label).trim() : undefined,
    size: String(b.size ?? "medium"),
    material: String(b.material ?? "wood"),
    color: String(b.color ?? ""),
    model: String(b.model ?? ""),
    unitPrice: b.unitPrice != null ? Number(b.unitPrice) : null,
    stockQuantity: b.stockQuantity != null ? Math.floor(Number(b.stockQuantity)) : 0,
    imageUris: parseJsonArray(b.imageUris),
    isDefault: Boolean(b.isDefault),
    sortOrder: b.sortOrder != null ? Math.floor(Number(b.sortOrder)) : 0,
  };
}

function parseVariantsInput(body: Record<string, unknown>): VariantBody[] {
  const raw = body.variants;
  if (!Array.isArray(raw)) return [];
  const out: VariantBody[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const v = parseVariant(item as Record<string, unknown>);
    if (v) out.push(v);
  }
  return out;
}

function validateDefaultVariant(variants: VariantBody[]): string | null {
  if (variants.length === 0) return "At least one variant is required";
  const defaults = variants.filter((v) => v.isDefault);
  if (defaults.length !== 1) return "Exactly one variant must have isDefault: true";
  return null;
}

async function ensureSingleDefault(productId: string, tx: Prisma.TransactionClient | typeof prisma): Promise<void> {
  const list = await tx.productVariant.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
  });
  if (list.length === 0) return;
  const def = list.find((v) => v.isDefault) ?? list[0];
  await tx.productVariant.updateMany({
    where: { productId },
    data: { isDefault: false },
  });
  await tx.productVariant.update({
    where: { id: def.id },
    data: { isDefault: true },
  });
}

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "12"), 10) || 12));
    const skip = (page - 1) * pageSize;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";

    const where: Prisma.ProductWhereInput = {};
    if (category) {
      where.category = category;
    }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { subcategory: { contains: q } },
        { variants: { some: { sku: { contains: q } } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: variantInclude,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ items, total });
  } catch (error) {
    handleError(res, error);
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: variantInclude,
    });
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.json(product);
  } catch (error) {
    handleError(res, error);
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = String(body.name || "").trim();
    if (!name) {
      res.status(400).json({ message: "name is required" });
      return;
    }

    const variants = parseVariantsInput(body);
    const rawVariants = body.variants;
    if (Array.isArray(rawVariants) && rawVariants.length > 0 && variants.length === 0) {
      res.status(400).json({
        message: "Each variant must include a non-empty sku",
      });
      return;
    }
    const err = validateDefaultVariant(variants);
    if (err) {
      res.status(400).json({ message: err });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: String(body.description ?? ""),
        category: String(body.category ?? "living_room"),
        subcategory: String(body.subcategory ?? ""),
        variants: {
          create: variants.map((v, i) => ({
            sku: v.sku,
            label: v.label ?? null,
            size: v.size,
            material: v.material,
            color: v.color,
            model: v.model,
            unitPrice: v.unitPrice,
            stockQuantity: v.stockQuantity ?? 0,
            imageUris: v.imageUris as unknown as Prisma.InputJsonValue,
            isDefault: v.isDefault,
            sortOrder: v.sortOrder ?? i,
          })),
        },
      },
      include: variantInclude,
    });

    const actor = req.user;
    await recordProductActivity({
      productId: product.id,
      action: "product_created",
      message: `Product "${product.name}" created with ${variants.length} variant(s)`,
      payload: { skus: variants.map((v) => v.sku) },
      actorUserId: actor?.id,
      actorName: actor?.name,
    });
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "SKU already exists" });
      return;
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Null constraint violation") && msg.includes("sku")) {
      res.status(500).json({
        message:
          "Database still has a legacy Product.sku column. Run: npx prisma migrate deploy (from mgr-casa-backend)",
      });
      return;
    }
    handleError(res, error);
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!existing) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const parent: Prisma.ProductUpdateInput = {};
    const changes: string[] = [];
    if (body.name != null) {
      const v = String(body.name);
      if (v !== existing.name) changes.push("name");
      parent.name = v;
    }
    if (body.description != null) {
      const v = String(body.description);
      if (v !== existing.description) changes.push("description");
      parent.description = v;
    }
    if (body.category != null) {
      const v = String(body.category);
      if (v !== existing.category) changes.push("category");
      parent.category = v;
    }
    if (body.subcategory != null) {
      const v = String(body.subcategory);
      if (v !== existing.subcategory) changes.push("subcategory");
      parent.subcategory = v;
    }

    const product = await prisma.$transaction(async (tx) => {
      if (Object.keys(parent).length > 0) {
        await tx.product.update({ where: { id }, data: parent });
      }

      if (body.variants !== undefined && Array.isArray(body.variants)) {
        const incoming = parseVariantsInput(body);
        const err = validateDefaultVariant(incoming);
        if (err) {
          throw new Error(err);
        }

        const incomingIds = new Set(incoming.map((v) => v.id).filter(Boolean) as string[]);

        for (const ev of existing.variants) {
          if (!incomingIds.has(ev.id)) {
            const cnt = await tx.orderLine.count({ where: { productVariantId: ev.id } });
            if (cnt > 0) {
              throw new Error(`Cannot remove variant ${ev.sku}: referenced by orders`);
            }
            await tx.productVariant.delete({ where: { id: ev.id } });
          }
        }

        for (const v of incoming) {
          const imgs = parseJsonArray(v.imageUris) as unknown as Prisma.InputJsonValue;
          if (v.id) {
            const cur = existing.variants.find((x) => x.id === v.id);
            if (!cur) continue;
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                label: v.label ?? null,
                size: v.size,
                material: v.material,
                color: v.color,
                model: v.model,
                unitPrice: v.unitPrice,
                stockQuantity: v.stockQuantity ?? 0,
                imageUris: imgs,
                isDefault: v.isDefault,
                sortOrder: v.sortOrder ?? 0,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: v.sku,
                label: v.label ?? null,
                size: v.size,
                material: v.material,
                color: v.color,
                model: v.model,
                unitPrice: v.unitPrice,
                stockQuantity: v.stockQuantity ?? 0,
                imageUris: imgs,
                isDefault: v.isDefault,
                sortOrder: v.sortOrder ?? 0,
              },
            });
          }
        }
        await ensureSingleDefault(id, tx);
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: variantInclude,
      });
    });

    const actor = req.user;
    if (changes.length > 0 || (body.variants !== undefined && Array.isArray(body.variants))) {
      await recordProductActivity({
        productId: id,
        action: "product_updated",
        message: `Updated ${changes.join(", ") || "variants"}`,
        payload: { fields: changes },
        actorUserId: actor?.id,
        actorName: actor?.name,
      });
    }
    res.json(product);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot remove variant")) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      (error.message.includes("At least one") || error.message.includes("Exactly one"))
    ) {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ message: "SKU already exists" });
      return;
    }
    handleError(res, error);
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    try {
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        res.status(409).json({ message: "Product is referenced by orders; cannot delete" });
        return;
      }
      throw error;
    }
    res.json({ message: "Deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

export const listProductActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "50"), 10) || 50));
    const skip = (page - 1) * pageSize;

    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const [items, total] = await Promise.all([
      prisma.productActivity.findMany({
        where: { productId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.productActivity.count({ where: { productId: id } }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (error) {
    handleError(res, error);
  }
};

export const adjustVariantInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, variantId } = req.params;
    const body = req.body as Record<string, unknown>;
    const action = String(body.action || "").trim();
    const qty = Math.floor(Number(body.quantity ?? 0));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!action || (action !== "add" && action !== "reduce" && action !== "set")) {
      res.status(400).json({ message: "action must be add, reduce, or set" });
      return;
    }
    if (action !== "set" && qty <= 0) {
      res.status(400).json({ message: "quantity must be positive for add/reduce" });
      return;
    }
    if (action === "set" && qty < 0) {
      res.status(400).json({ message: "quantity cannot be negative" });
      return;
    }

    const existing = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!existing || existing.productId !== productId) {
      res.status(404).json({ message: "Variant not found for this product" });
      return;
    }

    const prev = existing.stockQuantity;
    let next = prev;
    if (action === "add") next = prev + qty;
    else if (action === "reduce") next = Math.max(0, prev - qty);
    else next = qty;

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: next },
      include: { product: true },
    });

    const actor = req.user;
    const verb = action === "add" ? "Added" : action === "reduce" ? "Removed" : "Set";
    const detail =
      action === "set"
        ? `Stock set to ${next} (was ${prev}) for variant ${existing.sku}.`
        : `${verb} ${qty} unit(s). ${prev} → ${next}. (${existing.sku})`;
    await recordProductActivity({
      productId,
      action: "stock_adjusted",
      message: reason ? `${detail} ${reason}` : detail,
      payload: {
        variantId,
        sku: existing.sku,
        action,
        quantity: qty,
        previousStock: prev,
        newStock: next,
        reason: reason || undefined,
      },
      actorUserId: actor?.id,
      actorName: actor?.name,
    });

    const fullProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: variantInclude,
    });

    res.json({
      stockQuantity: variant.stockQuantity,
      variant,
      product: fullProduct,
    });
  } catch (error) {
    handleError(res, error);
  }
};

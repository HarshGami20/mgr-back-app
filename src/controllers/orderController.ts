
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { PhotoWithComment, User   } from "../types/custom";
import { handleError } from "../utils/errorHandler";
import { prisma } from "../prisma";
import { getUserFromToken } from "../utils/auth";
import {
  orderDetailInclude,
  orderLinesInclude,
  parseOrderLineInputs,
  replaceOrderLines,
} from "../utils/orderLineSync";



interface MulterFiles {
  [fieldname: string]: Express.Multer.File[];
}

/** Client pre-uploaded images (`POST /api/upload/image-json`) — only allow our uploads dir. */
function parsePreUploadedProductImagesJson(raw: unknown): { path: string; originalName: string }[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x: { path?: unknown; originalName?: unknown }) => {
        const p = typeof x?.path === "string" ? x.path.trim() : "";
        if (!p.startsWith("/uploads/") || p.includes("..")) return null;
        const originalName =
          typeof x?.originalName === "string" && x.originalName.trim()
            ? String(x.originalName).trim()
            : p.split("/").pop() || "image.jpg";
        return { path: p, originalName };
      })
      .filter((x): x is { path: string; originalName: string } => x != null);
  } catch {
    return [];
  }
}



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
  
const upload = multer({ storage });


const uploadMiddleware = upload.fields([
  { name: 'productImages', maxCount: 5 },
  { name: 'photosWithCommentsFiles', maxCount: 10 }
]);

export const orderUpload = uploadMiddleware;


// export const createOrder = async (req: Request, res: Response) => {
//   try {
//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//     const productImageFiles = files['productImages'] || [];
//     const photosWithCommentsFiles = files['photosWithCommentsFiles'] || [];
//     const user = getUserFromToken(req) as { id: string };

//     // Get the uploaded product image paths
//     const productImagePaths = productImageFiles.map(file => ({
//       path: `/uploads/${file.filename}`,
//       originalName: file.originalname
//     }));

//     // Process photosWithComments data
//     let photosWithComments = [];
//     if (req.body.photosWithCommentsData) {
//       const photosWithCommentsData = JSON.parse(req.body.photosWithCommentsData);

//       photosWithComments = photosWithCommentsData.map((item: any) => {
//         const file = photosWithCommentsFiles[item.fileIndex];
//         return {
//           photo: file ? `/uploads/${file.filename}` : null,
//           comment: item.comment
//         };
//       });
//     }

//     // Process assignees
//     let assignees = [];
//     if (req.body.assignees) {
//       assignees = JSON.parse(req.body.assignees); // expects a JSON stringified array
//     }

//     // Create the order with all necessary fields
//     const order = await prisma.order.create({
//       data: {
//         customerName: req.body.customerName,
//         phoneNumber: req.body.phoneNumber,
//         totalAmount: parseFloat(req.body.totalAmount),
//         modeOfPayment: req.body.modeOfPayment,
//         advanceAmount: parseFloat(req.body.advanceAmount || '0'),
//         lendingAmount: parseFloat(req.body.lendingAmount || '0'),
//         productImages: productImagePaths,
//         orderStatus: req.body.orderStatus,
//         paymentStatus: req.body.paymentStatus,
//         commentsFromStaff: req.body.commentsFromStaff ? JSON.parse(req.body.commentsFromStaff): [],
//         photosWithComments: photosWithComments,
//         dateOfDelivery: new Date(req.body.dateOfDelivery),
//         orderCategory: req.body.orderCategory,
//         createdById: user.id , // Replace with actual user ID from auth
//         assignees: assignees, // <--- added this
//       }
//     });

//     res.status(201).json({
//       message: 'Order created successfully',
//       order
//     });
//   } catch (error) {
//     console.error('Order creation error:', error);
//     res.status(500).json({
//       message: 'Failed to create order',
//       error: error instanceof Error ? error.message : String(error)
//     });
//   }
// };




export const createOrder = async (req: Request, res: Response): Promise<Response | any>  => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const productImageFiles = files['productImages'] || [];
    const photosWithCommentsFiles = files['photosWithCommentsFiles'] || [];
    const user = getUserFromToken(req) as { id: string };

    const preUploadedChallan = parsePreUploadedProductImagesJson(req.body.preUploadedProductImages);
    const productImagePaths = [
      ...preUploadedChallan,
      ...productImageFiles.map((file) => ({
        path: `/uploads/${file.filename}`,
        originalName: file.originalname,
      })),
    ];

    // Process photosWithComments data (multipart files and/or `photoPath` from JSON pre-upload)
    let photosWithComments = [];
    if (req.body.photosWithCommentsData) {
      const photosWithCommentsData = JSON.parse(req.body.photosWithCommentsData);

      photosWithComments = photosWithCommentsData.map((item: {
        photoPath?: unknown;
        fileIndex?: unknown;
        comment?: unknown;
      }) => {
        const p =
          typeof item.photoPath === "string" && item.photoPath.startsWith("/uploads/") && !item.photoPath.includes("..")
            ? item.photoPath
            : null;
        if (p) {
          return {
            photo: p,
            comment: typeof item.comment === "string" ? item.comment : "",
          };
        }
        const idx = item.fileIndex;
        const file =
          typeof idx === "number" && Number.isFinite(idx)
            ? photosWithCommentsFiles[idx]
            : undefined;
        return {
          photo: file ? `/uploads/${file.filename}` : null,
          comment: typeof item.comment === "string" ? item.comment : "",
        };
      });
    }

    // Process assignees
    let assignees = [];
    if (req.body.assignees) {
      try {
        assignees = JSON.parse(req.body.assignees); // expects a JSON stringified array
      } catch (e) {
        throw new Error('Assignees data is not valid JSON');
      }
    }

    const lineInputs = parseOrderLineInputs(req.body as Record<string, unknown>);

    // Validate required fields
    if (!req.body.customerName || !req.body.phoneNumber || !req.body.totalAmount || !req.body.modeOfPayment) {
      return res.status(400).json({
        message: 'Missing required fields: customerName, phoneNumber, totalAmount, or modeOfPayment',
      });
    }

    const orderCategory =
      typeof req.body.orderCategory === "string" && req.body.orderCategory.trim()
        ? req.body.orderCategory.trim()
        : "Home Furniture";
    const orderStatus =
      typeof req.body.orderStatus === "string" && req.body.orderStatus.trim()
        ? req.body.orderStatus.trim()
        : "Order Received";
    const dateOfDeliveryRaw = req.body.dateOfDelivery
      ? new Date(req.body.dateOfDelivery)
      : new Date();
    if (Number.isNaN(dateOfDeliveryRaw.getTime())) {
      return res.status(400).json({ message: "Invalid dateOfDelivery" });
    }

    // Parse amounts safely
    const totalAmount = parseFloat(req.body.totalAmount || '0');
    const advanceAmount = parseFloat(req.body.advanceAmount || '0');
    const lendingAmount = parseFloat(req.body.lendingAmount || '0');

    // Auto-calculate paymentStatus
    let paymentStatus = 'Due';
    if (lendingAmount === 0) {
      paymentStatus = 'Received';
    } else if (advanceAmount >= totalAmount) {
      paymentStatus = 'Received';
    } else if (advanceAmount > 0) {
      paymentStatus = 'Partial';
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderCode: randomUUID(),
          customerName: req.body.customerName,
          phoneNumber: req.body.phoneNumber,
          gst: req.body.gst,
          totalAmount,
          modeOfPayment: req.body.modeOfPayment,
          advanceAmount,
          lendingAmount,
          productImages: productImagePaths,
          orderStatus,
          paymentStatus,
          commentsFromStaff: req.body.commentsFromStaff
            ? JSON.parse(req.body.commentsFromStaff)
            : [],
          photosWithComments: photosWithComments,
          dateOfDelivery: dateOfDeliveryRaw,
          orderCategory,
          createdById: user.id,
          assignees: assignees,
        },
      });
      if (lineInputs.length > 0) {
        await replaceOrderLines(tx, created.id, lineInputs);
      }
      return tx.order.findUnique({
        where: { id: created.id },
        include: orderDetailInclude,
      });
    });

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      message: 'Failed to create order',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};



// export const getOrders = async (req: Request, res: Response): Promise<Response | any> => {
//   try {
//     const orders = await prisma.order.findMany({
//       include: { createdBy: true }
//     });
//      res.json(orders);
//   } catch (error) {
//     console.error(error);
//      handleError(res, error);
//   }
// };



export const getOrders = async (req: Request, res: Response): Promise<Response | any> => {
  try {
    const {
      offset = "0",
      limit = "",
      searchTerm = "",
      status,
      paymentStatus,
      category,
      sortOrder = "desc",
    } = req.query as Record<string, string>;

    const filters: any = {
      ...(status && status !== "all" && { orderStatus: status }),
      ...(paymentStatus && paymentStatus !== "all" && { paymentStatus }),
      ...(category && category !== "all" && { orderCategory: category }),
      ...(searchTerm && {
        OR: [
          { customerName: { contains: searchTerm } },
          { phoneNumber: { contains: searchTerm } },
          !isNaN(Number(searchTerm)) && { id: Number(searchTerm) },
        ].filter(Boolean),
      }),
    };

    const queryOptions: any = {
      where: filters,
      skip: parseInt(offset),
      orderBy: {
        createdAt: sortOrder === "asc" ? "asc" : "desc",
      },
      include: { createdBy: true, ...orderLinesInclude },
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
    }

    const orders = await prisma.order.findMany(queryOptions);

    return res.json({ orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};



export const getMyOrders = async (req: Request, res: Response): Promise<Response | any> => {
  try {
    const user = getUserFromToken(req) as { id: string };
    const {
      offset = "0",
      limit = "",
      searchTerm = "",
      status,
      paymentStatus,
      category,
      sortOrder = "desc",
    } = req.query as Record<string, string>;

    const filters: any = {
      /** My orders = created by this user only (not assignee-only rows). */
      createdById: user.id,
      ...(status && status !== "all" && { orderStatus: status }),
      ...(paymentStatus && paymentStatus !== "all" && { paymentStatus }),
      ...(category && category !== "all" && { orderCategory: category }),
      ...(searchTerm && {
        OR: [
          { customerName: { contains: searchTerm } },
          { phoneNumber: { contains: searchTerm } },
          !isNaN(Number(searchTerm)) && { id: Number(searchTerm) },
        ].filter(Boolean),
      }),
    };

    const queryOptions: any = {
      where: filters,
      skip: parseInt(offset),
      orderBy: {
        createdAt: sortOrder === "asc" ? "asc" : "desc",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        ...orderLinesInclude,
      },
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
    }

    const orders = await prisma.order.findMany(queryOptions);

    return res.json({ orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};


export const getOrder = async (req: Request, res: Response): Promise<Response | any> => {
  const { id } = req.params; // Extract order ID from request parameters

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id, 10) },
      include: orderDetailInclude,
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" }); // Handle case where order does not exist
    }

    res.json(order); // Send the fetched order as response
  } catch (error) {
    console.error(error);
    handleError(res, error); // Handle any errors that occur during the request
  }
};


export const updateOrder = async (req: Request, res: Response): Promise<Response | any> => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10); // Parse it into an integer
  const user: User = req.user as User;

  try {
    const order = await prisma.order.findUnique({ where: { id : parsedId } });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (user.role === "sales_person" && order.createdById !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (user.role === "worker") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const productImageFiles = files?.['productImages'] || [];
    const photosWithCommentsFiles = files?.['photosWithCommentsFiles'] || [];
    const preUploadedNewChallan = parsePreUploadedProductImagesJson(req.body.preUploadedNewProductImages);

    let productImages: { path: string; originalName: string }[] = [];
    if (productImageFiles.length > 0 || preUploadedNewChallan.length > 0) {
      const existingProductImages = JSON.parse(req.body.existingProductImages || "[]");
      const newFromFiles = productImageFiles.map((file) => ({
        path: `/uploads/${file.filename}`,
        originalName: file.originalname,
      }));
      productImages = [...existingProductImages, ...preUploadedNewChallan, ...newFromFiles];
    } else {
      productImages = JSON.parse(req.body.existingProductImages || "[]");
    }

    // ✅ Merge photosWithComments (new files + existing)
    const photosWithCommentsData = JSON.parse(req.body.photosWithCommentsData || "[]");

    const photosWithComments = photosWithCommentsData.map(
      (item: {
        photoPath?: unknown;
        fileIndex?: unknown;
        existingPhotoPath?: unknown;
        comment?: unknown;
      }) => {
        const p =
          typeof item.photoPath === "string" && item.photoPath.startsWith("/uploads/") && !item.photoPath.includes("..")
            ? item.photoPath
            : null;
        if (p) {
          return {
            photo: p,
            comment: typeof item.comment === "string" ? item.comment : "",
          };
        }
        if (item.fileIndex !== undefined) {
          const file = photosWithCommentsFiles[item.fileIndex as number];
          return {
            photo: file ? `/uploads/${file.filename}` : null,
            comment: typeof item.comment === "string" ? item.comment : "",
          };
        }
        return {
          photo: typeof item.existingPhotoPath === "string" ? item.existingPhotoPath : null,
          comment: typeof item.comment === "string" ? item.comment : "",
        };
      }
    );

    // ✅ Process assignees
    let assignees = [];
    if (req.body.assignees) {
      assignees = JSON.parse(req.body.assignees); // expects a JSON stringified array
    }


    const existingComments = JSON.parse(req.body.existingCommentsFromStaff || "[]");
    const newComments = JSON.parse(req.body.newCommentsFromStaff || "[]");

    const commentsFromStaff = [
      ...existingComments,
      ...newComments.map((item: any) => ({
        comment: item.comment,
        commentedBy: item.commentedBy,
        timestamp: item.timestamp || new Date().toISOString(),
      }))
    ];


    const updateData: any = {
      customerName: req.body.customerName,
      phoneNumber: req.body.phoneNumber,
      gst:req.body.gst,
      totalAmount: parseFloat(req.body.totalAmount),
      modeOfPayment: req.body.modeOfPayment,
      advanceAmount: parseFloat(req.body.advanceAmount || '0'),
      lendingAmount: parseFloat(req.body.lendingAmount || '0'),
      orderStatus: req.body.orderStatus,
      paymentStatus: req.body.paymentStatus,
      // commentsFromStaff: req.body.commentsFromStaff,
      commentsFromStaff: JSON.parse(req.body.commentsFromStaff || "[]"),

      dateOfDelivery: new Date(req.body.dateOfDelivery),
      orderCategory: req.body.orderCategory,
      productImages: productImages,
      photosWithComments: photosWithComments,
      assignees: assignees, // 🔥 added here
    };

    const lineInputs = parseOrderLineInputs(req.body as Record<string, unknown>);
    const shouldReplaceLines =
      req.body.orderLines !== undefined || req.body.lineItems !== undefined;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: parsedId },
        data: updateData,
      });
      if (shouldReplaceLines) {
        await replaceOrderLines(tx, parsedId, lineInputs);
      }
      return tx.order.findUnique({
        where: { id: parsedId },
        include: orderDetailInclude,
      });
    });

    return res.json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Order update error:', error);
    return handleError(res, error);
  }
};


export const addCommentToOrder = async (req: Request, res: Response): Promise<Response | any> => {
  const { orderId, comment,commentedBy  } = req.body;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Ensure commentsFromStaff is an array, even if it's null or undefined
    const existingComments = Array.isArray(order.commentsFromStaff)
      ? order.commentsFromStaff: []; // Default to empty array if commentsFromStaff is not an array

    const updatedComments = [
      ...existingComments,
      {
        comment,
        commentedBy,
        timestamp: new Date().toISOString(),
      },
    ];

    // Update the order with the new comments
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        commentsFromStaff: updatedComments, // Make sure this is properly formatted as an array
      },
    });

    res.json({ message: "Comment added", order: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

function normalizePaymentLabel(status: unknown): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "received") return "Received";
  if (s === "due") return "Due";
  if (s === "partial") return "Partial";
  return String(status ?? "");
}


export const updateStatus = async (req: Request,res:Response): Promise<Response | any> =>{
  const { id } = req.params;
  const parsedId = parseInt(id, 10);
  const { orderStatus, paymentStatus, lendingAmount, payments } = req.body;

  try {
    const existing = await prisma.order.findUnique({
      where: { id: parsedId },
      include: { payments: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (orderStatus != null && String(orderStatus).trim() !== "") {
      await prisma.order.update({
        where: { id: parsedId },
        data: { orderStatus },
      });
    }

    let addedPayments = false;
    if (Array.isArray(payments)) {
      for (const payment of payments) {
        const amt = parseFloat(String(payment?.amount ?? ""));
        if (!Number.isFinite(amt) || amt <= 0) continue;
        await prisma.payment.create({
          data: {
            amount: amt,
            method: typeof payment?.method === "string" && payment.method.trim()
              ? payment.method.trim()
              : "Cash",
            orderId: parsedId,
            paymentDate: new Date(),
          },
        });
        addedPayments = true;
      }
    }

    const after = await prisma.order.findUnique({
      where: { id: parsedId },
      include: { payments: true },
    });
    if (!after) {
      return res.status(500).json({ error: "Order not found after update" });
    }

    const sumInstallments = after.payments.reduce((s, p) => s + p.amount, 0);
    const totalCollected = after.advanceAmount + sumInstallments;
    const remaining = Math.max(0, after.totalAmount - totalCollected);
    let autoPaymentStatus = normalizePaymentLabel(after.paymentStatus);
    if (remaining < 0.01) {
      autoPaymentStatus = "Received";
    } else if (totalCollected > 0.01) {
      autoPaymentStatus = "Partial";
    } else {
      autoPaymentStatus = "Due";
    }

    if (addedPayments) {
      await prisma.order.update({
        where: { id: parsedId },
        data: {
          lendingAmount: remaining,
          paymentStatus: autoPaymentStatus,
        },
      });
    } else {
      await prisma.order.update({
        where: { id: parsedId },
        data: {
          paymentStatus:
            paymentStatus != null && String(paymentStatus).trim() !== ""
              ? normalizePaymentLabel(paymentStatus)
              : after.paymentStatus,
          lendingAmount:
            lendingAmount != null && String(lendingAmount).trim() !== ""
              ? parseFloat(String(lendingAmount))
              : after.lendingAmount,
        },
      });
    }

    const orderWithPayments = await prisma.order.findUnique({
      where: { id: parsedId },
      include: orderDetailInclude,
    });

    res.status(200).json(orderWithPayments);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

export const getSingleOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10); // Parse it into an integer

    const order = await prisma.order.findUnique({
      where: { id: parsedId }, // Use the parsed integer ID
      include: { createdBy: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    return handleError(res, error);
  }
};

const resolvePath = (relativePath: string) => {
  return path.resolve(process.cwd(), relativePath);
};

const deleteFiles = (files: { path: string }[]) => {
  files.forEach(file => {
    if (!file.path) {
      console.warn(`Warning: Missing path for file`, file);
      return;
    }

    const filePath = resolvePath(file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    } else {
      console.warn(`File does not exist: ${filePath}`);
    }
  });
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10); 
  const user = req.user as User;

  try {
    const order = await prisma.order.findUnique({ where: { id: parsedId } });

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (user.role === "sales_person" && order.createdById !== user.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    if (user.role === "worker") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    if (order.productImages && Array.isArray(order.productImages)) {
      deleteFiles(order.productImages as { path: string }[]);
    }

    if (order.photosWithComments && Array.isArray(order.photosWithComments)) {
      const photosWithComments = order.photosWithComments.map((item: any) => {
        if (typeof item.photo === "string" && typeof item.comment === "string") {
          return { photo: item.photo, comment: item.comment };
        }
        throw new Error("Invalid photoWithComments data");
      });

      photosWithComments.forEach(item => {
        if (item.photo) {
          const photoPath = resolvePath(item.photo);
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
            console.log(`Deleted photo: ${photoPath}`);
          } else {
            console.warn(`Photo does not exist: ${photoPath}`);
          }
        }
      });
    }
    await prisma.payment.deleteMany({
      where: { orderId: parsedId },
    });

    await prisma.order.delete({ where: { id: parsedId } });

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Order deletion error:', error);
    handleError(res, error);
  }
};

export const deleteAllOrders = async (req: Request, res: Response): Promise<void> => {
  const password = typeof req.query.password === "string" ? req.query.password : undefined;
  const currentUser = req.user as User;

  if (!password) {
    res.status(400).json({ message: "Password is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: currentUser.email } });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (user.role !== "super_admin") {
    res.status(403).json({ message: "Forbidden: Only super admins can perform this action" });
    return;
  }

  if (!user.password) {
    res.status(401).json({ message: "Unauthorized: Missing user password" });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    res.status(401).json({ message: "Unauthorized: Invalid password" });
    return;
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        createdById: "cm9quy5ia0000ul4sx2wysrzh"
      },
      skip: 0,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        createdBy: true
      },
      take: 20
    });

    for (const order of orders) {
      if (order.productImages && Array.isArray(order.productImages)) {
        deleteFiles(order.productImages as { path: string }[]);
      }

      if (order.photosWithComments && Array.isArray(order.photosWithComments)) {
        const photosWithComments = order.photosWithComments as (PhotoWithComment | any)[];
        photosWithComments.forEach(item => {
          if (typeof item.photo === "string") {
            const photoPath = resolvePath(item.photo);
            if (fs.existsSync(photoPath)) {
              fs.unlinkSync(photoPath);
              console.log(`Deleted photo: ${photoPath}`);
            } else {
              console.warn(`Photo does not exist: ${photoPath}`);
            }
          }
        });
      }
      await prisma.payment.deleteMany({
        where: { orderId: order.id },
      });
      await prisma.order.delete({ where: { id: order.id } });
    }

    res.json({ message: 'All orders deleted successfully' });
  } catch (error) {
    console.error('Error deleting orders:', error);
    res.status(500).json({ message: 'Error deleting orders', error: error });
  }
};

export const bulkDeleteOrders = async (req: Request, res: Response): Promise<void> => {
  const password = typeof req.body.password === "string" ? req.body.password : undefined;
  const { filterType, year, month, startDate, endDate } = req.body;
  const currentUser = req.user as User;

  if (!password) {
    res.status(400).json({ message: "Password is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: currentUser.email } });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (user.role !== "super_admin") {
    res.status(403).json({ message: "Forbidden: Only super admins can perform this action" });
    return;
  }

  if (!user.password) {
    res.status(401).json({ message: "Unauthorized: Missing user password" });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    res.status(401).json({ message: "Unauthorized: Invalid password" });
    return;
  }

  try {
    // Build date filter based on filterType
    let dateFilter: any = {};

    if (filterType === "year" && year) {
      const startOfYear = new Date(parseInt(year), 0, 1);
      const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      dateFilter = {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      };
    } else if (filterType === "month" && year && month) {
      const monthNum = parseInt(month);
      const startOfMonthDate = new Date(parseInt(year), monthNum - 1, 1);
      const endOfMonthDate = new Date(parseInt(year), monthNum, 0, 23, 59, 59, 999);
      dateFilter = {
        createdAt: {
          gte: startOfMonthDate,
          lte: endOfMonthDate,
        },
      };
    } else if (filterType === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = {
        createdAt: {
          gte: start,
          lte: end,
        },
      };
    } else {
      res.status(400).json({ message: "Invalid filter parameters" });
      return;
    }

    // Find orders matching the filter
    const orders = await prisma.order.findMany({
      where: dateFilter,
      include: {
        createdBy: true,
      },
    });

    let deletedCount = 0;

    // Delete each order and its associated files
    for (const order of orders) {
      // Delete product images
      if (order.productImages && Array.isArray(order.productImages)) {
        deleteFiles(order.productImages as { path: string }[]);
      }

      // Delete photos with comments
      if (order.photosWithComments && Array.isArray(order.photosWithComments)) {
        const photosWithComments = order.photosWithComments as (PhotoWithComment | any)[];
        photosWithComments.forEach(item => {
          if (typeof item.photo === "string") {
            const photoPath = resolvePath(item.photo);
            if (fs.existsSync(photoPath)) {
              fs.unlinkSync(photoPath);
              console.log(`Deleted photo: ${photoPath}`);
            } else {
              console.warn(`Photo does not exist: ${photoPath}`);
            }
          }
        });
      }

      // Delete payments
      await prisma.payment.deleteMany({
        where: { orderId: order.id },
      });

      // Delete the order
      await prisma.order.delete({ where: { id: order.id } });
      deletedCount++;
    }

    res.json({ 
      message: `Successfully deleted ${deletedCount} order(s)`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error bulk deleting orders:', error);
    res.status(500).json({ message: 'Error deleting orders', error: error instanceof Error ? error.message : String(error) });
  }
};


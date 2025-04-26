
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { PhotoWithComment, User   } from "../types/custom";
import { handleError } from "../utils/errorHandler";
import { prisma } from "../prisma";
import { getUserFromToken } from "../utils/auth";



interface MulterFiles {
  [fieldname: string]: Express.Multer.File[];
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

    // Get the uploaded product image paths
    const productImagePaths = productImageFiles.map(file => ({
      path: `/uploads/${file.filename}`,
      originalName: file.originalname
    }));

    // Process photosWithComments data
    let photosWithComments = [];
    if (req.body.photosWithCommentsData) {
      const photosWithCommentsData = JSON.parse(req.body.photosWithCommentsData);

      photosWithComments = photosWithCommentsData.map((item: any) => {
        const file = photosWithCommentsFiles[item.fileIndex];
        return {
          photo: file ? `/uploads/${file.filename}` : null,
          comment: item.comment
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

    // Validate required fields
    if (!req.body.customerName || !req.body.phoneNumber || !req.body.totalAmount || !req.body.modeOfPayment) {
      return res.status(400).json({
        message: 'Missing required fields: customerName, phoneNumber, totalAmount, or modeOfPayment',
      });
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

    // Create the order with all necessary fields
    const order = await prisma.order.create({
      data: {
        customerName: req.body.customerName,
        phoneNumber: req.body.phoneNumber,
        totalAmount,
        modeOfPayment: req.body.modeOfPayment,
        advanceAmount,
        lendingAmount,
        productImages: productImagePaths,
        orderStatus: req.body.orderStatus,
        paymentStatus,
        commentsFromStaff: req.body.commentsFromStaff ? JSON.parse(req.body.commentsFromStaff) : [],
        photosWithComments: photosWithComments,
        dateOfDelivery: new Date(req.body.dateOfDelivery),
        orderCategory: req.body.orderCategory,
        createdById: user.id, 
        assignees: assignees, 
      }
    });
    res.status(201).json({
      message: 'Order created successfully',
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



export const getOrders = async (req: Request, res: Response): Promise<Response | any> => {
  try {
    const orders = await prisma.order.findMany({
      include: { createdBy: true }
    });
     res.json(orders);
  } catch (error) {
    console.error(error);
     handleError(res, error);
  }
};

export const getOrder = async (req: Request, res: Response): Promise<Response | any> => {
  const { id } = req.params; // Extract order ID from request parameters

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id, 10) }, // Use the order ID to fetch the specific order
      include: {  createdBy: {
        select: {
          name: true, 
          role: true, 
        }
      }, payments : true}, // Optionally include related data, like createdBy
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

    // ✅ Merge existing + new productImages
    const existingProductImages = JSON.parse(req.body.existingProductImages || "[]");
    const newProductImages = productImageFiles.map((file) => ({
      path: `/uploads/${file.filename}`,
      originalName: file.originalname,
    }));
    const productImages = [...existingProductImages, ...newProductImages];

    // ✅ Merge photosWithComments (new files + existing)
    const photosWithCommentsData = JSON.parse(req.body.photosWithCommentsData || "[]");

    const photosWithComments = photosWithCommentsData.map((item: any) => {
      if (item.fileIndex !== undefined) {
        const file = photosWithCommentsFiles[item.fileIndex];
        return {
          photo: file ? `/uploads/${file.filename}` : null,
          comment: item.comment,
        };
      } else {
        return {
          photo: item.existingPhotoPath,
          comment: item.comment,
        };
      }
    });

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

    const updatedOrder = await prisma.order.update({
      where: { id : parsedId },
      data: updateData,
    });

    return res.json({
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Order update error:', error);
    return handleError(res, error);
  }
};


export const addCommentToOrder = async (req: Request, res: Response): Promise<Response | any> => {
  const { orderId, comment,commentedBy  } = req.body;
  const user = getUserFromToken(req) as { id: string };

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
console.log(user)
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


export const updateStatus = async (req: Request,res:Response): Promise<Response | any> =>{
  const { id } = req.params;
  const parsedId = parseInt(id, 10); // Parse it into an integer
  const { orderStatus, paymentStatus ,lendingAmount, payments  } = req.body;


  try {
    const updatedOrder = await prisma.order.update({
      where: { id : parsedId  },
      data: {
        orderStatus,
        paymentStatus,
        lendingAmount
      },
    });


    // Check if payment status is not 'received'
    if (paymentStatus !== 'received') {
      // Ensure payments is an array and has at least one payment
      if (Array.isArray(payments) && payments.length > 0) {
        for (const payment of payments) {
          // Create multiple payment records for the order
          await prisma.payment.create({
            data: {
              // orderId: updatedOrder.id,     // Link to the updated order
              amount: parseFloat(payment.amount),  // Payment amount (ensure it's a valid number)
              method: payment.method,              // Payment method (e.g., "cash", "card", "upi")
              order: {
                connect: {
                  id: updatedOrder.id, // The ID of the order you're associating the payment with
                },
              },
              paymentDate: new Date().toISOString(),
            },
          });
        }
      }
    }


    
    // Return the updated order along with payments
    const orderWithPayments = await prisma.order.findUnique({
      where: { id: updatedOrder.id },
      include: {
        payments: true, // Include payments in the response
      },
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
    const orders = await prisma.order.findMany();

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


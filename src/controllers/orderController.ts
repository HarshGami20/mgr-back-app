
import { Request, Response } from "express";
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { User } from "../types/custom";
import { handleError } from "../utils/errorHandler";
import { prisma } from "../prisma";


// const prisma = new PrismaClient();

interface MulterFiles {
  [fieldname: string]: Express.Multer.File[];
}

interface PhotoWithComment {
  photo: string | null;
  comment: string;
}

// Configure multer for file storage
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

// Handle multiple uploads with fields
const uploadMiddleware = upload.fields([
  { name: 'productImages', maxCount: 5 },
  { name: 'photosWithCommentsFiles', maxCount: 10 }
]);

export const orderUpload = uploadMiddleware;


export const createOrder = async (req: Request, res: Response) => {
  try {
    // Access uploaded files through req.files (already processed by multer middleware)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const productImageFiles = files['productImages'] || [];
    const photosWithCommentsFiles = files['photosWithCommentsFiles'] || [];
    
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
    
    // Create the order with all necessary fields
    const order = await prisma.order.create({
      data: {
        customerName: req.body.customerName,
        phoneNumber: req.body.phoneNumber,
        totalAmount: parseFloat(req.body.totalAmount),
        modeOfPayment: req.body.modeOfPayment,
        advanceAmount: parseFloat(req.body.advanceAmount || '0'),
        lendingAmount: parseFloat(req.body.lendingAmount || '0'),
        productImages: productImagePaths, // Store array of file paths as JSON
        description: req.body.description || '',
        orderStatus: req.body.orderStatus,
        paymentStatus: req.body.paymentStatus,
        commentsFromStaff: req.body.commentsFromStaff || '',
        photosWithComments: photosWithComments, // Store processed photos with comments as JSON
        dateOfDelivery: new Date(req.body.dateOfDelivery),
        orderCategory: req.body.orderCategory,
        createdById: "cm9glbvab0001ulpgtgq77j0n", // Replace with actual user ID from auth context
      }
    });
    
    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create order',
      error: error instanceof Error ? error.message : String(error)
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

// export const updateOrder = async (req: Request, res: Response): Promise<Response | any> => {
//   const { id } = req.params;
//   const user: User = req.user as User;
  
//   try {
//     const order = await prisma.order.findUnique({
//       where: { id },
//     });
    
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }
    
//     if (user.role === "sales_person" && order.createdById !== user.id) {
//       return res.status(403).json({ message: "Forbidden" });
//     }
    
//     if (user.role === "worker") {
//       return res.status(403).json({ message: "Forbidden" });
//     }
    
//     // Access uploaded files through req.files (already processed by multer middleware)
//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//     const productImageFiles = files['productImages'] || [];
//     const photosWithCommentsFiles = files['photosWithCommentsFiles'] || [];
    
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
//         // Check if this is a new file or an existing one
//         if (item.fileIndex !== undefined) {
//           const file = photosWithCommentsFiles[item.fileIndex];
//           return {
//             photo: file ? `/uploads/${file.filename}` : null,
//             comment: item.comment
//           };
//         } else {
//           // This is an existing file, preserve the photo path
//           return {
//             photo: item.photo,
//             comment: item.comment
//           };
//         }
//       });
//     }
    
//     // Prepare update data
//     const updateData: any = { ...req.body };
    
//     // Only update images if new ones were uploaded
//     if (productImageFiles.length > 0) {
//       updateData.productImages = productImagePaths;
//     }
    
//     // Only update photosWithComments if new data was provided
//     if (req.body.photosWithCommentsData) {
//       updateData.photosWithComments = photosWithComments;
//     }
    
//     // Handle numeric fields
//     if (updateData.totalAmount) updateData.totalAmount = parseFloat(updateData.totalAmount);
//     if (updateData.advanceAmount) updateData.advanceAmount = parseFloat(updateData.advanceAmount || '0');
//     if (updateData.lendingAmount) updateData.lendingAmount = parseFloat(updateData.lendingAmount || '0');
//     if (updateData.dateOfDelivery) updateData.dateOfDelivery = new Date(updateData.dateOfDelivery);
    
//     // Remove any fields that shouldn't be part of the update
//     delete updateData.photosWithCommentsData;
//     delete updateData.photosWithCommentsFiles;
//     delete updateData.productImages;
    
//     const updatedOrder = await prisma.order.update({
//       where: { id },
//       data: updateData,
//     });
    
//     return res.json({
//       message: 'Order updated successfully',
//       order: updatedOrder
//     });
//   } catch (error) {
//     console.error('Order update error:', error);
//     return handleError(res, error);
//   }
// };


// export const updateOrder = async (req: Request, res: Response): Promise<Response | any> => {
//   const { id } = req.params;
//   const user: User = req.user as User;

//   try {
//     const order = await prisma.order.findUnique({ where: { id } });

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     if (user.role === "sales_person" && order.createdById !== user.id) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     if (user.role === "worker") {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     // Check if req.files exists and contains the expected fields
//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
//     if (!files || !files['productImages'] || !files['photosWithCommentsFiles']) {
//       console.log('No files found in the request');
//     }

//     const productImageFiles = files?.['productImages'] || [];
//     const photosWithCommentsFiles = files?.['photosWithCommentsFiles'] || [];

//     // Get the uploaded product image paths
//     const productImagePaths = productImageFiles.map(file => ({
//       path: `/uploads/${file.filename}`,
//       originalName: file.originalname,
//     }));

//     let photosWithComments = [];
//     if (req.body.photosWithCommentsData) {
//       const photosWithCommentsData = JSON.parse(req.body.photosWithCommentsData);
//       photosWithComments = photosWithCommentsData.map((item: any) => {
//         if (item.fileIndex !== undefined) {
//           const file = photosWithCommentsFiles[item.fileIndex];
//           return {
//             photo: file ? `/uploads/${file.filename}` : null,
//             comment: item.comment,
//           };
//         } else {
//           return { photo: item.photo, comment: item.comment };
//         }
//       });
//     }

//     const updateData: any = { ...req.body };
    
//     if (productImageFiles.length > 0) {
//       updateData.productImages = productImagePaths;
//     }

//     if (req.body.photosWithCommentsData) {
//       updateData.photosWithComments = photosWithComments;
//     }

//     // Handle numeric fields
//     if (updateData.totalAmount) updateData.totalAmount = parseFloat(updateData.totalAmount);
//     if (updateData.advanceAmount) updateData.advanceAmount = parseFloat(updateData.advanceAmount || '0');
//     if (updateData.lendingAmount) updateData.lendingAmount = parseFloat(updateData.lendingAmount || '0');
//     if (updateData.dateOfDelivery) updateData.dateOfDelivery = new Date(updateData.dateOfDelivery);

//     delete updateData.photosWithCommentsData;
//     delete updateData.photosWithCommentsFiles;
//     delete updateData.productImages;

//     const updatedOrder = await prisma.order.update({
//       where: { id },
//       data: updateData,
//     });

//     return res.json({
//       message: 'Order updated successfully',
//       order: updatedOrder
//     });
//   } catch (error) {
//     console.error('Order update error:', error);
//     return handleError(res, error);
//   }
// };

export const updateOrder = async (req: Request, res: Response): Promise<Response | any> => {
  const { id } = req.params;
  const user: User = req.user as User;

  try {
    const order = await prisma.order.findUnique({ where: { id } });

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

    const photosWithComments = photosWithCommentsData.map((item: any, index: number) => {
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

    const updateData: any = {
      customerName: req.body.customerName,
      phoneNumber: req.body.phoneNumber,
      totalAmount: parseFloat(req.body.totalAmount),
      modeOfPayment: req.body.modeOfPayment,
      advanceAmount: parseFloat(req.body.advanceAmount || '0'),
      lendingAmount: parseFloat(req.body.lendingAmount || '0'),
      description: req.body.description,
      orderStatus: req.body.orderStatus,
      paymentStatus: req.body.paymentStatus,
      commentsFromStaff: req.body.commentsFromStaff,
      dateOfDelivery: new Date(req.body.dateOfDelivery),
      orderCategory: req.body.orderCategory,
      productImages: productImages,
      photosWithComments: photosWithComments,
    };

    const updatedOrder = await prisma.order.update({
      where: { id },
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

// Function to delete files from disk
// const deleteFiles = (files: { path: string }[]) => {
//   files.forEach(file => {
//     if (!file.path) {
//       console.warn(`Warning: Missing path for file`, file);  // Log for debugging
//       return;  // Skip this file if path is missing
//     }
    
//     const filePath = path.join(__dirname, '../../', file.path);
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);  // Delete the file from disk
//       console.log(`Deleted file: ${filePath}`);  // Log file deletion for debugging
//     } else {
//       console.warn(`File does not exist: ${filePath}`);  // Log if file does not exist
//     }
//   });
// };

// export const deleteOrder = async (req: Request, res: Response): Promise<Response | any> => {
//   const { id } = req.params;
//   const user = req.user as User;

//   try {
//     const order = await prisma.order.findUnique({ where: { id } });

//     if (!order) return res.status(404).json({ message: "Order not found" });

//     if (user.role === "sales_person" && order.createdById !== user.id) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     if (user.role === "worker") {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     // Delete files associated with the order (if any)
//     if (order.productImages && Array.isArray(order.productImages)) {
//       // Ensure the path is defined and valid before attempting deletion
//       deleteFiles(order.productImages as { path: string }[]);
//     }

//     if (order.photosWithComments) {
//       const photosWithComments = order.photosWithComments as PhotoWithComment[];
//       photosWithComments.forEach(item => {
//         if (item.photo) {
//           const photoPath = path.join(__dirname, '../../', item.photo);
//           if (fs.existsSync(photoPath)) {
//             fs.unlinkSync(photoPath);  // Delete each photo
//             console.log(`Deleted photo: ${photoPath}`);  // Log photo deletion for debugging
//           } else {
//             console.warn(`Photo does not exist: ${photoPath}`);  // Log if photo does not exist
//           }
//         }
//       });
//     }

//     // Delete the order from the database
//     await prisma.order.delete({ where: { id } });

//     return res.json({ message: 'Order deleted successfully' });
//   } catch (error) {
//     console.error('Order deletion error:', error);
//     return handleError(res, error);
//   }
// };

export const updateStatus = async (req: Request,res:Response): Promise<Response | any> =>{
  const { id } = req.params;
  const { orderStatus, paymentStatus, commentsFromStaff } = req.body;


  try {
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        orderStatus,
        paymentStatus,
        commentsFromStaff
      },
    });

    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
}




export const getSingleOrder = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: String(id) },
      include: { createdBy: true }, // Include createdBy relation
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


import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { addCommentToOrder, createOrder, deleteAllOrders, deleteOrder, getMyOrders, getOrder, getOrders, orderUpload, updateOrder, updateStatus } from "../controllers/orderController";
import { getReports } from "../controllers/reportController";
import { deleteUser, login, register, updateUserInfo } from "../controllers/authController";
import { getAllUsers, updateUserRole } from "../controllers/userController";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin";
import { handleError } from "../utils/errorHandler";

const router = express.Router();

// Example route to demonstrate async behavior
async function someAsyncFunction() {
  return { key: "value" };
}

router.get('/example', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await someAsyncFunction();
    res.status(200).json({ message: "Success", data });
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// Public routes — no auth required
router.post("/login", login);
router.post("/register", authMiddleware, requireSuperAdmin, register);
router.put("/update-user-info", authMiddleware, requireSuperAdmin, updateUserInfo);
router.delete("/users/:id", authMiddleware, deleteUser);

// Apply authentication middleware to protected routes
router.use(authMiddleware);

// Protected routes
router.post('/orders', orderUpload, createOrder);
router.get("/orders", getOrders);
router.get("/order/:id", getOrder);
router.put("/orders/id=:id", orderUpload, updateOrder);
router.delete('/orders/all', requireSuperAdmin, deleteAllOrders);
router.delete('/orders/:id', deleteOrder);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserRole);
router.patch('/orders/:id/update-status', updateStatus);
router.post("/orders/comments", addCommentToOrder);
router.get("/reports", getReports);
router.get("/myorders", getMyOrders);

export default router;

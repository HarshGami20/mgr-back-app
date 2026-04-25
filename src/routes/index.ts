

import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { addCommentToOrder, bulkDeleteOrders, createOrder, deleteAllOrders, deleteOrder, getMyOrders, getOrder, getOrders, orderUpload, updateOrder, updateStatus } from "../controllers/orderController";
import {
  adjustVariantInventory,
  createProduct,
  deleteProduct,
  getProduct,
  listInventoryLogs,
  listProductActivity,
  listProducts,
  updateProduct,
} from "../controllers/productController";
import { requireRole, Role } from "../middleware/requireRole";
import { getReports } from "../controllers/reportController";
import {
  getAdminOrdersDashboard,
  getMyOrdersDashboard,
} from "../controllers/dashboardController";
import {
  uploadImageMiddleware,
  uploadProductImage,
  uploadProductImageJson,
} from "../controllers/uploadController";
import {
  deleteUser,
  getSessionUser,
  login,
  register,
  updateUserInfo,
} from "../controllers/authController";
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
} from "../controllers/branchController";
import {
  getAllUsers,
  getAssignableRoles,
  getUserById,
  getUsersForOrderAssignment,
  updateUserRole,
  updateUserBranches,
  listDevUsers,
  devImpersonateLogin,
} from "../modules/users/userController";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin";
import { devUserToolsOnly } from "../middleware/devUserToolsOnly";
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
router.get("/users/dev-list", devUserToolsOnly, listDevUsers);
router.post("/users/dev-login", devUserToolsOnly, devImpersonateLogin);
/** Catalog reads — app can load products before login (dev picker / public list). */
router.get("/products", listProducts);
router.get("/products/:id", getProduct);
router.post("/register", authMiddleware, requireSuperAdmin, register);
router.put("/update-user-info", authMiddleware, requireSuperAdmin, updateUserInfo);
router.delete("/users/:id", authMiddleware, deleteUser);

// Apply authentication middleware to protected routes
router.use(authMiddleware);

router.get("/users/me", getSessionUser);
router.get(
  "/users/order-assignees",
  requireRole([
    Role.super_admin,
    Role.admin,
    Role.sales_person,
    Role.worker,
    Role.manufacturer,
    Role.supplier,
  ]),
  getUsersForOrderAssignment
);
router.get("/users/roles", requireSuperAdmin, getAssignableRoles);
router.get("/users", requireSuperAdmin, getAllUsers);
router.get("/users/:id", requireSuperAdmin, getUserById);
router.put("/users/:id/branches", requireSuperAdmin, updateUserBranches);
router.put("/users/:id", requireSuperAdmin, updateUserRole);

router.get("/branches", listBranches);
router.post("/branches", requireSuperAdmin, createBranch);
router.patch("/branches/:id", requireSuperAdmin, updateBranch);
router.delete("/branches/:id", requireSuperAdmin, deleteBranch);

router.post(
  "/upload/image",
  requireRole([Role.super_admin, Role.admin, Role.sales_person]),
  uploadImageMiddleware,
  uploadProductImage
);
router.post(
  "/upload/image-json",
  requireRole([Role.super_admin, Role.admin, Role.sales_person]),
  uploadProductImageJson
);

router.get("/products/:id/activity", listProductActivity);
router.get(
  "/inventory/logs",
  requireRole([Role.super_admin, Role.admin, Role.sales_person, Role.worker]),
  listInventoryLogs
);
router.post(
  "/products/:productId/variants/:variantId/inventory-adjust",
  requireRole([Role.super_admin, Role.admin, Role.sales_person, Role.worker]),
  adjustVariantInventory
);
router.post(
  "/products",
  requireRole([Role.super_admin, Role.admin, Role.sales_person]),
  createProduct
);
router.patch(
  "/products/:id",
  requireRole([Role.super_admin, Role.admin, Role.sales_person]),
  updateProduct
);
router.delete(
  "/products/:id",
  requireRole([Role.super_admin, Role.admin]),
  deleteProduct
);

// Protected routes
router.post('/orders', orderUpload, createOrder);
router.get(
  "/orders/dashboard/admin",
  requireRole([Role.super_admin, Role.admin]),
  getAdminOrdersDashboard
);
router.get(
  "/orders/dashboard/mine",
  requireRole([
    Role.super_admin,
    Role.admin,
    Role.sales_person,
    Role.worker,
    Role.supplier,
    Role.manufacturer,
  ]),
  getMyOrdersDashboard
);
router.get("/orders", getOrders);
router.get("/order/:id", getOrder);
router.put("/orders/id=:id", orderUpload, updateOrder);
router.delete('/orders/all', requireSuperAdmin, deleteAllOrders);
router.delete('/orders/bulk', requireSuperAdmin, bulkDeleteOrders);
router.delete('/orders/:id', deleteOrder);
router.patch('/orders/:id/update-status', updateStatus);
router.post("/orders/comments", addCommentToOrder);
router.get("/reports", getReports);
router.get("/myorders", getMyOrders);

export default router;

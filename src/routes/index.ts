import express, { Request, Response } from "express";

import { authMiddleware } from "../middleware/authMiddleware";
import { createOrder, deleteOrder, getOrders, getSingleOrder, orderUpload, updateOrder, updateStatus } from "../controllers/orderController";
import { getReports } from "../controllers/reportController";
import { handleError } from "../utils/errorHandler";
import { login, register, updatePassword } from "../controllers/authController";
import { getAllUsers, updateUserRole } from "../controllers/userController";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin";

const router = express.Router();

router.get('/example', async (req: Request, res: Response): Promise<Response | any> => {
  try {
    const data = await someAsyncFunction();
    res.status(200).json({ message: "Success", data });
  } catch (error: unknown) {
    handleError(res, error);
  }
});
async function someAsyncFunction() {
  return { key: "value" };
}






// Public routes — no auth
router.get("/order/:id", getSingleOrder); 
// router.post("/register", register);
router.post("/login", login);



// Only authenticated super_admin can register users
router.post("/register", authMiddleware, requireSuperAdmin, register);

// Only authenticated super_admin can update passwords
router.put("/update-password", authMiddleware, requireSuperAdmin, updatePassword);




// Apply authMiddleware only for protected routes after this line
router.use(authMiddleware);

// Protected routes
router.post('/orders', orderUpload, createOrder);   

// router.post("/orders", createOrder);
router.get("/orders", getOrders);
// router.put("/orders/id=:id", updateOrder);
router.put("/orders/id=:id", orderUpload, updateOrder); // ✅ Multer middleware added

router.delete('/orders/:id', deleteOrder);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserRole);
router.patch('/orders/:id/update-status',updateStatus);


router.get("/reports", getReports);


export default router;


// import express from "express";
// import { createOrder, getOrders, updateOrder } from "../controllers/orderController";
// import { requireRole, Role } from "../middleware/requireRole";

// const orderRouter = express.Router();

// orderRouter.post("/", requireRole([Role.admin, Role.super_admin, Role.sales_person]), createOrder);
// orderRouter.get("/", requireRole([Role.admin, Role.super_admin, Role.sales_person, Role.worker]), getOrders);
// orderRouter.put("/:id", requireRole([Role.admin, Role.super_admin, Role.sales_person]), updateOrder);

// export default orderRouter;

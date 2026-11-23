import { OverviewController } from "@/controllers/overview.controller";
import { Router } from "express";

const router = Router();
const overviewController = new OverviewController();

/**
 * Get overview data
 */
router.get('/', overviewController.getOverview);

export default router;

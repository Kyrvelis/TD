import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lobbyRouter from "./lobby";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lobbyRouter);

export default router;

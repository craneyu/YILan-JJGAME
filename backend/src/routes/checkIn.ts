import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth";
import {
  listParticipants,
  setWeighIn,
  setCheckIn,
} from "../controllers/checkInController";

const router = Router({ mergeParams: true });

// 唯讀名冊：裁判端需依過磅／檢錄狀態判斷選手是否可出賽，故一併開放，
// 回傳內容僅含姓名與過磅／檢錄狀態，不含體重數值。
// 寫入（過磅、檢錄）仍限檢錄人員與管理員。
router.get(
  "/",
  verifyToken,
  requireRole("check_in_officer", "admin", "match_referee"),
  listParticipants,
);

router.patch(
  "/:teamId/:memberIndex/weigh-in",
  verifyToken,
  requireRole("check_in_officer", "admin"),
  setWeighIn,
);

router.patch(
  "/:teamId/:memberIndex/check-in",
  verifyToken,
  requireRole("check_in_officer", "admin"),
  setCheckIn,
);

export default router;

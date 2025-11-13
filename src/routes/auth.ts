import { Router } from "express";
import { AuthService } from "../controllers/authcontroller";
import { authMiddleware } from "../middleware/verifyToken";
import { AuthRequest } from "../middleware/verifyToken";
import { roleGuard } from "../middleware/roleguard";
const authService = new AuthService();
const router = Router();

router.post("/create-admin", async (req, res) => {
  await authService.createAdmin(req, res);
});

router.post("/login", async (req, res) => {
  await authService.login(req, res);
});

//route to check authentication is wired correctly
router.get(
  "/protected",
  authMiddleware,
  roleGuard(["admin"]),
  (req: AuthRequest, res) => {
    res.status(201).json({ message: req.user });
  }
);

router.post("/regenerate-tokens", async (req, res) => {
  await authService.regenerateTokens(req, res);
});

export default router;

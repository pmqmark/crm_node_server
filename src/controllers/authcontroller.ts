import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/user"; // Ensure correct path
import { CreateUserDto, loginUserDto, validitatedUser } from "../dtos/userdto"; // Ensure correct path
import {
  generateAccessToken,
  generateRefreshToken,
} from "../middleware/tokenMiddleware";
import Admin from "../models/admin";
import { CreateAdminDto } from "../dtos/admindto";
import jwt, { JwtPayload } from "jsonwebtoken";

export class AuthService {
  async createAdmin(req: Request, res: Response): Promise<Response> {
    try {
      const adminData: CreateAdminDto = req.body;

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Create new admin
      const admin = new Admin({
        email: adminData.email,
        password: hashedPassword,
        username: adminData.username,
        admin_id: adminData.admin_id,
        createdAt: new Date(),
        lastLogin: null,
      });

      const savedAdmin = await admin.save();

      return res.status(201).json({
        message: "Admin created successfully",
        admin: savedAdmin,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({
          message: `Error creating admin: ${error.message}`,
        });
      }
      return res.status(500).json({
        message: "An unknown error occurred while creating admin",
      });
    }
  }

  async login(
    req: Request,
    res: Response
  ): Promise<validitatedUser | Response> {
    try {
      const userData: loginUserDto = req.body;
      const { email, password } = userData;

      const usr = await User.findOne({ email, isActive: true });

      if (!usr) {
        throw new Error("Invalid credentials");
      }

      const isPasswordValid = await bcrypt.compare(password, usr.password);
      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      const verifieduser: validitatedUser = {
        id: usr._id,
        email: usr.email,
        role: usr.role,
      };

      const accesstoken = generateAccessToken(verifieduser);
      const refreshtoken = generateRefreshToken(verifieduser);

      return res.status(200).json({
        message: "Login successful",
        user: verifieduser,
        accesstoken,
        refreshtoken,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: `${error.message}` });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async regenerateTokens(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (typeof refreshToken !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid Token",
          data: null,
          error: "BAD_REQUEST",
        });
      }

      const decoded: any = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      );
      console.log({ decoded });

      const verifieduser: validitatedUser = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      const accessToken = generateAccessToken(verifieduser);

      const rt = generateRefreshToken(verifieduser);

      return res.status(200).json({
        success: true,
        message: "success",
        data: { accessToken, refreshToken: rt },
        error: null,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: `${error.message}` });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

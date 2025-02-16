import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from '../models/user' // Ensure correct path
import { CreateUserDto, loginUserDto, validitatedUser } from "../dtos/userdto"; // Ensure correct path
import { generateAccessToken, generateRefreshToken } from "../middleware/tokenMiddleware";

export class AuthService {
  async createUser(req: Request, res: Response): Promise<Response> {
    try {
      const userData: CreateUserDto = req.body;
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      console.log(userData.password)
      const usr = new User({
        role: userData.role,
        email: userData.email,
        password: userData.password,
        createdAt: new Date(),
        lastLogin: null,
      });

      const savedusr = await usr.save();
      return res.status(201).json({
        message: "User created successfully",
        user: savedusr,
      });

    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: `Error creating user: ${error.message}` });
      }
      return res.status(500).json({ message: "An unknown error occurred while creating user" });
    }
  }



  async login(req: Request, res: Response): Promise<validitatedUser|Response> {
    try {
      const userData: loginUserDto = req.body;
      const {email,password}=userData

        const usr = await User.findOne({ email }); 
        console.log(usr)  
        if (!usr) {
        throw new Error('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, usr.password);
        if (!isPasswordValid) {
                throw new Error('Invalid credentials');
        }

        

        const verifieduser:validitatedUser={
            id:usr._id,
            email:usr.email,
            role:usr.role
        }

        const accesstoken =generateAccessToken(verifieduser)
        const refreshtoken=generateRefreshToken(verifieduser)

          
        return res.status(200).json({
            message: "Login successful",
            user: verifieduser,
            accesstoken,
            refreshtoken
        });
      

    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: `Error creating user: ${error.message}` });
      }
      return res.status(500).json({ message: "An unknown error occurred while creating user" });
    }
  }



  
}

      

// async validateUser(email: string, password: string): Promise<ValidatedUser> {
//     const user = await UserModel.findOne({ email });   
//     if (!user) {
//       throw new Error('Invalid credentials');
//     }
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       throw new Error('Invalid credentials');
//     }
//     if (!user?.isActive) {
//       throw new Error('Inactive User');
//     }
//     return {
//       _id: user._id,
//       email: user.email,
//       roles: user.roles
//     };
//   }

  


import jwt from 'jsonwebtoken';
const expiryAccessToken = "1d";
const expiryRefreshToken = "7d";
import { validitatedUser } from "../dtos/userdto"; 
export const generateAccessToken = (userInfo:validitatedUser) => {
  
  return jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: expiryAccessToken })
};
export const generateRefreshToken = (userInfo: validitatedUser) => {
 return jwt.sign(userInfo, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: expiryRefreshToken });
};
export { expiryAccessToken, expiryRefreshToken };

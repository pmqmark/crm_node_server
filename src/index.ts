import express, { NextFunction, Request,Response } from 'express'
import dotenv from 'dotenv';
import path from 'path';
const CookieParser = require("cookie-parser");
const cors = require("cors");
const db=require("./db")

dotenv.config({ 
    path: path.resolve(__dirname, '.env')
  });

import  adminRouter from "./routes/admin";
import authRouter from "./routes/auth"
import { generateAccessToken, generateRefreshToken } from "./middleware/tokenMiddleware";


const app=express()
db.connect()
app.use(CookieParser())
app.use(express.json()); // ✅ Parses JSON bodies
app.use(express.urlencoded({ extended: true })); // ✅ Parses URL-encoded bodies

app.use('/api/admin',adminRouter)
app.use('/api/auth',authRouter)



const PORT=process.env.PORT;
console.log(PORT)

app.listen(PORT,()=>{
    // console.log(generateAccessToken(dummyUser))
    console.log(`Running on port ${PORT}`);
});


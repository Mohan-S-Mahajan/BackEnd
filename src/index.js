import dotenv from "dotenv";
// dotenv.config()
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})
console.log("ENV CHECK:", process.env.MONGODB_URI);

connectDB()
import dotenv from "dotenv";
// dotenv.config()
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})
console.log("ENV CHECK:", process.env.MONGODB_URI);

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 4000, () => {
            console.log(`Server is Running at port ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log('dataBase Connection Error', err)
    })
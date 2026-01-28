import { v2 as cloudinary } from "cloudinary";
import fs from "fs"



// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        //* file uploaded
        // console.log("File Uploaded Successfully", response.url)
        fs.unlinkSync(localFilePath); // ✅ cleanup after success
        return response

    } catch (error) {
        if (localFilePath) {
            fs.unlinkSync(localFilePath);// remove the locally saved temp file as the upload operation got failed
            //* unlinked successfully
        }
        console.log("Error Occured in File Upload", error)

    }
}


export { uploadOnCloudinary }

import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
const registerUser = asyncHandler(async (req, res) => {
    //!         get user details from frontEnd
    //!    validation - not empty
    //!  check if user already exists: username,email
    //! check for images, check for avatar
    //! upload them to cloudinary, check avatar
    //! create user object- create entry in DB
    //! remove password and refresh token feed from response
    //! check for userCreation
    //! return res



    //? get user details
    const { fullName, email, username, password } = req.body
    // console.log("email", email)


    //? Validation
    const isEmpty = (value) => {
        return !value || value.trim() === "";
    };
    if (
        isEmpty(fullName) ||
        isEmpty(email) ||
        isEmpty(username) ||
        isEmpty(password)
    ) {
        throw new ApiError(400, "All fields are required");
    }
    if (!email.includes("@")) {
        throw new ApiError(400, "Invalid email");
    }
    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters");
    }


    //? check if user already exists: username,email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User is Already Exist")
    }


    //? check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is Required")
    }


    //? upload them to cloudinary, check avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar is Required")
    }


    //? create user object- create entry in DB
    //? remove password and refresh token feed from response
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    //? check for userCreation
    if (!createdUser) {
        throw new ApiError(500, "Something Went Wrong While Registerinig user")

    }


    //?  return res
    return res.status(201).json(new ApiResponse(201, createdUser, "USER REGISTERED SUCCESSFULLY"))

})

export { registerUser }
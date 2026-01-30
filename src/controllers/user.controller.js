import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import User  from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const generateAccessTokenAndgenerateRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Internal Server Something went wrong while generating refresh and access token")
    }
}

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

const logInUser = asyncHandler(async (req, res) => {

    //! req body-> data
    //! username or eamil to find 
    //! find user
    //! password check
    //! access refresh and access token 
    //! send cookie
    //! return res


    const { username, password, email } = req.body;
    // if (!username && !email || !password) {
    if (!username) {
        throw new ApiError(400, "Username or Password are Required")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) throw new ApiError(404, "User does not exists")


    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) throw new ApiError(402, "Password is incorrect")

    const { accessToken, refreshToken } = await generateAccessTokenAndgenerateRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .cookie("accesstoken", accessToken, options)
        .cookie("refreshtoken", refreshToken, options)
        .json(
            new ApiResponse(
                200, {
                user: loggedInUser, accessToken, refreshToken,
            },
                "USER LOGGEDIN SUCCESSFULLY"
            ),
        )

})

const logOutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "USER LOGGED OUT"))

})










export { registerUser, logInUser, logOutUser }

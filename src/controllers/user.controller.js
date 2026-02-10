import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import User from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


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


const refreshAccessToken = asyncHandler(async (req, res) => {

    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorised Request")
        }

        const decodedToken = jwt.verify(incomingRefreshToken,
            process.env.ACCESS_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is Expired or Used")
        }


        const { newRefreshToken, accessToken } = await generateAccessTokenAndgenerateRefreshToken(user._id)


        const options = {
            httpOnly: true,
            secure: true
        }


        return res
            .status(201)
            .cookie("AccessToken", accessToken, options)
            .cookie("RefreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { newRefreshToken, accessToken },
                    "AccessToken REFRESHED SUCCESFULLY"
                )
            )
    } catch (error) {
        throw ApiError(401, error?.message || "Invalid refresh Token")

    }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Password is Incorrect")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json((
            new ApiResponse(200, {}, "PASSWORD IS CHANGED")
        ))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(20)
        .json(200, req.user, "current user fetched Successfully")
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All Fields are Required")
    }


    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")


    return res.status(200)
        .json(new ApiResponse(200, user, "Accout Details Upadated Successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Avatar file uploading Error")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")
    return res.status(200)
        .json(new ApiResponse(200, user, "avatar Upadated Successfully"))

})


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const CoverImageLocalPath = req.file?.path

    if (!CoverImageLocalPath) {
        throw new ApiError(400, "cover file is missing")
    }

    const coverImage = await uploadOnCloudinary(CoverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, "cover file uploading Error")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")
    return res.status(200)
        .json(new ApiResponse(200, user, "coverImage Upadated Successfully"))

})


export {
    registerUser,
    logInUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}

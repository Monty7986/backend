import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const getRefreshAndAccessToken = async (userId) => {
 try {
  const user = await User.findById(userId);
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false})

  return { accessToken, refreshToken}

 } catch (error) {
    throw new ApiError(400, "Invalid credentials");
 }
}

const registerUser = asyncHandler( async (req, res) => {
  // get details from frontend 
  // validations - non empty
  // check if user already exists - username, email
  // check for images, check for avatar
  // upload them to cloudinary - avatar
  // create user object - create entry in db
  // remove password and refreshToken fields from response 
  // check for user creation 
  // return response

  const { username, email, fullName, password } = req.body;

  if([username, email, fullName, password].some((field) => field?.trim() === "")){
      throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
})

  if(existedUser){
    throw new ApiError(409, "User with email or username already exists");  
  }

  const avatarLocalpath = req.files?.avatar[0]?.path;
  // console.log(req.files)
  // const coverImageLocalpath = req.files?.coverImage[0]?.path;

  let coverImageLocalpath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalpath = req.files.coverImage[0].path
  }

  if(!avatarLocalpath){
    throw new ApiError(400, "Avatar file is required");
  }
  
  const avatar = await uploadOnCloudinary(avatarLocalpath);
  const coverImage = await uploadOnCloudinary(coverImageLocalpath);
  
  if(!avatar){
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar : avatar.url,
    coverImage: coverImage?.url || ""
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

    if(!createdUser){
      throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler( async (req,res) => {
  // console.log("hiii")
  // req.body => data
  // username or email
  // find the user 
  // password check 
  // access and refresh token
  // send coookie

  const { username, email, password} = req.body;
  // console.log("req.body",req.body)
  // console.log("email",email)

  // if(!username && !email){
  if(!(username || email)){
    throw new ApiError(400, "Username and email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })
  // console.log("user",user);
    
    if(!user){
      throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    // console.log("password",isPasswordValid)
    
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials")
    }
    
    const {accessToken, refreshToken} = await getRefreshAndAccessToken(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    // console.log("loggedUser",loggedInUser)
    // console.log("accessToken",accessToken)
    // console.log("refreshToken",refreshToken)

    const Options = {
      httpOnly: true,
      secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, Options)
    .cookie("refreshToken", refreshToken, Options)
    .json(
      new ApiResponse(200,
        {
          user: loggedInUser, accessToken, refreshToken
        }, 
        "User logged In Successfully"
      )
    )
})

const logoutUser = asyncHandler ( async (req,res) => {
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

  const Options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken",Options)  
  .clearCookie("refreshToken",Options)
  .json(
    new ApiResponse(200,{},"User Logged out")
  )  
})

const refreshAccessToken = asyncHandler ( async (req,res) => {

  const incomingToken = req.cookies?.refreshToken || req.body.refreshToken; 

  if(!incomingToken){
    throw new ApiError(401,"Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id);
  
    if(!user){
      throw new ApiError(401, "Invalid access token");
    }
    
    if(incomingToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expired or used")
    }
  
    const { accessToken, newRefreshToken} = await getRefreshAndAccessToken(user._id);
  
    const Options = {
      httpOnly: true,
      secure: true
    }
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, Options)
    .cookie("refreshToken", newRefreshToken, Options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
})

const changeCurrentPassword = asyncHandler( async(req, res) => {

  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await req.user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400,"Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false})

  return res
  .status(200)
  .json(
    new ApiResponse(200, {}, "Password changed Successfully")
  )
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "User fetched successfully")
    )
})

const updateAccountDetails = asyncHandler (async(req, res) => {

    const {fullName, email} = req.body;

    if (!fullName || !email) {
      throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName: fullName,
          email: email
        }
      },
      {
        new: true
      }
    ).select("-password");

    return res
    .status(200)
    .json(
      new ApiResponse(200,user,"Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler( async (req, res) => {

    const avatarLocalpath = req.file?.path;

    if (!avatarLocalpath) {
      throw new ApiError(400, "Avatar file is missing")
    }
      //TODO: delete old image - assignment
      const avatar = await uploadOnCloudinary(avatarLocalpath);
      
    if(!avatar.url){
      throw new ApiError(400, "Error while uploading updated avatar file")
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url
        }
      },
      {
        new: true
      }
    ).select("-password");

    return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Avtar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler( async ( req, res) => {

    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover image file is missing")
    }
    
    //TODO: delete old image - assignment mofule old image to be deleted
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading updated Cover image")
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: coverImage.url
        }
      },
      {
        new: true
      }
    ).select("-password");

    return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler ( async(req, res) => {
    const {username} = req.parmas;

    if (!username?.trim()) {
      throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase()
        }
      },
      {
        // lookups are use to join two collection properties 
        $lookup: {
          from: "subcscriptions", // collection name
          localField: "_id", 
          foreignField: "channel",
          as: "subscribers" // get subscribers count
        }
      },
      {
        $lookup: {
          from: "subcscriptions", // collection name
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribed" // get subscribedTo count
        }
      },
      {
        $addFields: {
          subscribersCount:{
            $size: "$subscribers" // subscribers is field, add $
          },
          subscribedTo: {
            $size: "$subscribed"
           },
           isSubscribed: {
            $cond: {
              $if: { $in: [req.user?._id, "$subscribers.subscriber"]},
              then: true,
              else: false
            }
           }
        }
      },
      {
        $project: {
          username: 1,
          fullName: 1,
          subscribersCount: 1,
          subscribedTo: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1
        }
      }
    ])
    console.log(channel)

    if(!channel?.length){
      throw new ApiError(400,"channel does not exists")
    }

    return res
    .status(200)
    .json(
      new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

const getuserWatchHistory = asyncHandler( async(req, res) => {

  const user = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])  
  console.log(user);

  return res
  .status(200)
  .json(
    new ApiResponse(
      200, user[0].watchHistory,
      "Watch history fetch successfully"
    )
  )
})

export { registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getuserWatchHistory
};
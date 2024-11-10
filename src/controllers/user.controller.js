import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"

const getRefreshAndAccessToken = async (userId) => {
 try {
  const user = await User.findById(userId);
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken;

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

  // req.body => data
  // username or email
  // find the user 
  // password check 
  // access and refresh token
  // send coookie

  const { username, email, password} = req.body;

  if(!(username || email)){
    throw new ApiError(400, "Username and email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })
    
    if(!user){
      throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials")
    }
    
    const {accessToken, refreshToken} = await getRefreshAndAccessToken(user._id);
    
    const loggedInUser = await user.findById(user._id).select("-password -refreshToken");

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


export { registerUser,
  loginUser,
  logoutUser
       };
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"


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

export default registerUser;
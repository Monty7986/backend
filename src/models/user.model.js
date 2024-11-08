import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema({
  username: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "username is required"],
    trim: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "email is required"],
    trim: true
  },
  fullName: {
    type: String,
    lowercase: true,
    required: true,
    trim: true
  },
  avatar: {
    type: String, // cloudinary url
    required: true
  },
  coverImage: {
    type: String
  },
  watchHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Video"
    }
  ],
  password: {
    type: String,
    required: [true, "password must be required"]
  },
  refreshToken: {
    type: String
  }

}, {
  timestamps: true
})

userSchema.pre("save", async function (next) {
  if(!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10)
  next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password,this.password)
}

userSchema.models.generateAccessToken = function () {
  return jwt.sign({
    _id: this._id,
    email:this.email,
    username:this.username,
    fullName:this.fullName
  },
    process.env.ACCESS_TOKEN_SECRET,
  {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
  })
}

userSchema.models.generateRefreshToken = function () {
  return jwt.sign({
    _id: this._id
  },
    process.env.REFRESH_TOKEN_SECRET,
  {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  })
}

export const User = mongoose.model("User", userSchema)
import connectDB from "./db/index.js";
import dotenv from "dotenv"
import app from "./app.js"

dotenv.config({
  path: "/.env"
})

connectDB().then(() => {
  app.on("Error",(error) => {
    console.error(error.message)
  })
  app.listen(process.env.PORT || 8000 , () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  })
})
.catch((error) => {
  console.log("MongoDB connection FAILED ", error);
})

















// const app = express();

// (  async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     app.on("Error", (error) => {
//         console.error("App is not able to Connect to Database");
//         throw error
//     })
//     app.listen(process.env.PORT, () => {
//       console.log(`App is listning on port ${process.env.PORT}`);
//     })
//   } catch (error) {
//     console.error("Error : ", error);
//     throw error
//   }
// })()
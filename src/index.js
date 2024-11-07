import connectDB from "./db/index.js";
import dotenv from "dotenv"

dotenv.config({
  path: "/.env"
})

connectDB();



















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
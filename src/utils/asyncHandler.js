// This function is a higher-order middleware wrapper for handling errors in asynchronous Express route handlers.

const asyncHandler = (reqestHandler) => 
  (req,res,next) => {
    Promise.resolve(reqestHandler(req,res,next))
    .catch((error) => next(error))
  }

  export default asyncHandler;

  // const asyncHandler = (func) => async (req,res,next) => {
  //   try {
  //     await func(req,res,next)
  //   } catch (error) {
  //     res.status(error.code || 500).json({
  //       success: false,
  //       msg: error.message
  //     })
  //   }
  // }
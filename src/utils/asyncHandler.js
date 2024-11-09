// This function is a higher-order middleware wrapper for handling errors in asynchronous Express route handlers.

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
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
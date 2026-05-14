export const notFoundResponse = (res, message, logMessage) => {
  if (logMessage) {
    console.error(logMessage);
  }

  return res.status(404).json({
    success: false,
    message,
  });
};



export const badRequestResponse = (res, message, logMessage) => {
  console.log("🚀 ~ utils.js:15 ~ badRequestResponse ~ message:", message)
  if (logMessage) {
    console.error(logMessage);
  }

  return res.status(400).json({
    success: false,
    message,
  });
};



export const successResponse = (res, data,message,logMessage)=>{
  console.log(logMessage)
  return res.status(200).json({
    success:true,
    data,
    message
  })
}


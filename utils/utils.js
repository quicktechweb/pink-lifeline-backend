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
  if (logMessage) {
    console.error(logMessage);
  }

  return res.status(400).json({
    success: false,
    message,
  });
};
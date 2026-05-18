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

export const somethingWentWrong = (res, data, message, logMessage) => {
  console.error(data, logMessage);
  return res.status(503).json({
    success: false,
    message: message,
  });
};

export const successResponse = (res, data, message, logMessage) => {
  console.log(logMessage);

  const isArray = Array.isArray(data);

  return res.status(200).json({
    success: true,
    length: isArray ? data.length : undefined,
    data,
    message,
  });
};

export const alreadyExistResponse = (res, data, message, logMessage) => {
  console.error(logMessage);
  return res.status(409).json({
    success: false,
    data,
    message,
  });
};

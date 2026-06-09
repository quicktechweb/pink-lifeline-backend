export const apiLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

console.log(
  `➡️  🕒 ${new Date().toLocaleString()} | ${req.method.padEnd(6)} | ${res.statusCode} | ${duration}ms | ${req.originalUrl}`
);
  });

  next();
};
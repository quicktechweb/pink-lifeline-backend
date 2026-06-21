const getTimeEmoji = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "🌅";      // Morning
  if (hour >= 12 && hour < 17) return "☀️";     // Afternoon
  if (hour >= 17 && hour < 20) return "🌇";     // Evening
  return "🌙";                                  // Night
};

export const apiLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const timeEmoji = getTimeEmoji();

    console.log(
      `➡️  ${timeEmoji}  ${new Date().toLocaleString()} | ${req.method.padEnd(6)} | ${res.statusCode} | ${duration}ms | ${req.originalUrl}`
    );
  });

  next();
};
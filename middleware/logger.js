const getTimeEmoji = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "🌅"; // Morning
  if (hour >= 12 && hour < 17) return "☀️"; // Afternoon
  if (hour >= 17 && hour < 20) return "🌇"; // Evening

  return "🌙"; // Night
};

const getClockEmoji = () => {
  const now = new Date();
  let hours = now.getHours() % 12;
  const minutes = now.getMinutes();

  // Convert 0 to 12
  if (hours === 0) hours = 12;

  const fullHours = [
    "🕛", // 12
    "🕐", // 1
    "🕑", // 2
    "🕒", // 3
    "🕓", // 4
    "🕔", // 5
    "🕕", // 6
    "🕖", // 7
    "🕗", // 8
    "🕘", // 9
    "🕙", // 10
    "🕚", // 11
  ];

  const halfHours = [
    "🕧", // 12:30
    "🕜", // 1:30
    "🕝", // 2:30
    "🕞", // 3:30
    "🕟", // 4:30
    "🕠", // 5:30
    "🕡", // 6:30
    "🕢", // 7:30
    "🕣", // 8:30
    "🕤", // 9:30
    "🕥", // 10:30
    "🕦", // 11:30
  ];

  return minutes < 30
    ? fullHours[hours % 12]
    : halfHours[hours % 12];
};

export const apiLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const timeEmoji = getTimeEmoji();
    const clockEmoji = getClockEmoji();

    console.log(
      `➡️  ${timeEmoji} ${clockEmoji} ${new Date().toLocaleString()} | ${req.method.padEnd(
        6
      )} | ${res.statusCode} | ${duration}ms | ${req.originalUrl}`
    );
  });

  next();
};
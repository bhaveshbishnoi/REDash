export const getSpeedEmoji = (speed: number): string => {
  if (speed < 20) return '🐢';
  if (speed < 40) return '🚗';
  if (speed < 60) return '🏍️';
  if (speed < 80) return '🚀';
  if (speed < 100) return '⚡';
  return '🔥';
};

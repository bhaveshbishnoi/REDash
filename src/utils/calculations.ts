export const getSpeedEmoji = (speed: number): string => {
  if (speed < 20) return '🐢';      // Turtle
  if (speed < 40) return '🚗';      // Car
  if (speed < 60) return '🏍️';      // Motorcycle
  if (speed < 80) return '🚀';      // Rocket
  if (speed < 100) return '⚡';     // Lightning
  return '🔥';                       // Fire
};

export const getTerrainEmoji = (terrainType: string): string => {
  return terrainType === 'city' ? '🏙️' : '🛣️';
};

export const getTimeOfDayEmoji = (hour: number): string => {
  return (hour >= 6 && hour < 18) ? '☀️' : '🌙';
};

export const classifyTerrain = (avgSpeed: number): 'city' | 'highway' => {
  return avgSpeed > 50 ? 'highway' : 'city';
};

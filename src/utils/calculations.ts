export const getSpeedIcon = (speed: number): string => {
  if (speed < 20) return 'turtle';
  if (speed < 40) return 'car';
  if (speed < 60) return 'motorbike';
  if (speed < 80) return 'rocket';
  if (speed < 100) return 'lightning-bolt';
  return 'fire';
};

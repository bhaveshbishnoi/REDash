export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateTotalDistance = (segments: any[]): number => {
  let total = 0;
  for (let i = 1; i < segments.length; i++) {
    total += calculateDistance(
      segments[i - 1].latitude,
      segments[i - 1].longitude,
      segments[i].latitude,
      segments[i].longitude
    );
  }
  return total;
};

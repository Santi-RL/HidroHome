export const formatSeconds = (value: number | undefined): string => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return '0 s';
  }

  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} s`);
  return parts.join(' ');
};

export const secondsFromIndex = (index: number, stepSeconds: number) =>
  Math.max(0, Math.round(index * stepSeconds));

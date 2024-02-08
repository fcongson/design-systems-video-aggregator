export const formatDuration = (duration) => {
  // Check if durationStr is a string
  if (typeof duration !== "string") {
    return "?";
    console.error("Invalid input: not a string");
  }

  // Check if the durationStr matches the expected format "hh:mm:ss"
  const regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const match = duration.match(regex);

  if (match) {
    const [, hours, minutes, seconds] = match.map(Number);

    if (hours === 0 && minutes === 0) {
      return `${seconds}s`;
    } else if (hours === 0 && minutes < 5 && seconds > 9) {
      return `${minutes}m ${seconds}s`;
    } else if (hours === 0 && minutes < 5) {
      return `${minutes}m`;
    } else if (hours === 0 && minutes >= 5) {
      return `${minutes}m`;
    } else if (seconds !== 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  } else {
    return "";
  }
};

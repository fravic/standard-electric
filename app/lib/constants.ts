// Time constants
export const MILLISECONDS_PER_IN_GAME_HOUR = 5000; // 1 "hour" in the game is 5 seconds
export const HOURS_PER_DAY = 24;
export const BUSINESS_DAY_START = 9;

// Player colors
export const PLAYER_COLORS = [
  "#46C9CD", // Teal
  "#67CA76", // Green
  "#8346CD", // Purple
  "#CD7946"  // Orange - fits the palette as a complementary color
];

// Function to get a player color based on player number
export const getPlayerColor = (playerNumber: number): string => {
  // Use modulo to wrap around if there are more players than colors
  const colorIndex = (playerNumber - 1) % PLAYER_COLORS.length;
  return PLAYER_COLORS[colorIndex];
};

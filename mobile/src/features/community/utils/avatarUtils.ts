/**
 * Avatar utility functions for mapping users to their profile images
 * 
 * IMPORTANT: React Native requires static require() paths at build time.
 * If an image file doesn't exist, the build will fail. Make sure all
 * referenced images exist in mobile/assets/avatars/ before building.
 * 
 * To add a new avatar:
 * 1. Place the PNG file in mobile/assets/avatars/ with the correct name
 * 2. Add an entry to the avatarImages object below
 * 3. The Avatar component will automatically use it
 */

// Pre-require all avatar images (React Native requires static paths)
// All images mapped to alien avatars
const avatarImages: Record<string, number | null> = {
  // Leaderboard users (by userId) - all 25 users mapped
  // Note: alien_05 and alien_06 don't exist, so using alien_11-12 for users 5-6
  '1': require('../../../../assets/avatars/alien_01.png'), // CryptoKing
  '2': require('../../../../assets/avatars/alien_02.png'), // WallStreetBear
  '3': require('../../../../assets/avatars/alien_03.png'), // TechBull
  '4': require('../../../../assets/avatars/alien_04.png'), // DayTraderPro
  '5': require('../../../../assets/avatars/alien_11.png'), // SwingMaster (using 11 since 05 doesn't exist)
  '6': require('../../../../assets/avatars/alien_12.png'), // TradeGuru (using 12 since 06 doesn't exist)
  '7': require('../../../../assets/avatars/alien_07.png'), // MarketWhiz
  '8': require('../../../../assets/avatars/alien_08.png'), // ProfitSeeker
  '9': require('../../../../assets/avatars/alien_09.png'), // BullRun
  '10': require('../../../../assets/avatars/alien_13.png'), // StockMaster
  '11': require('../../../../assets/avatars/alien_14.png'), // AlphaTrader
  '12': require('../../../../assets/avatars/alien_15.png'), // TradingPro
  '13': require('../../../../assets/avatars/alien_16.png'), // MarketMaven
  '14': require('../../../../assets/avatars/alien_17.png'), // TradeExpert
  '15': require('../../../../assets/avatars/alien_18.png'), // ProfitHunter
  '16': require('../../../../assets/avatars/alien_19.png'), // BullTrader
  '17': require('../../../../assets/avatars/alien_20.png'), // StockWizard
  '18': require('../../../../assets/avatars/alien_21.png'), // TradeKing
  '19': require('../../../../assets/avatars/alien_22.png'), // MarketGenius
  '20': require('../../../../assets/avatars/alien_23.png'), // ProfitPro
  '21': require('../../../../assets/avatars/alien_24.png'), // BullMaster
  '22': require('../../../../assets/avatars/alien_25.png'), // StockExpert
  '23': require('../../../../assets/avatars/alien_26.png'), // TradeHero
  '24': require('../../../../assets/avatars/alien_27.png'), // MarketLeader
  '25': require('../../../../assets/avatars/alien_28.png'), // ProfitChamp
  
  // Friends leaderboard users
  'user-1': require('../../../../assets/avatars/alien_29.png'), // Alice
  'user-2': require('../../../../assets/avatars/alien_30.png'), // Bob
  'user-4': require('../../../../assets/avatars/alien_31.png'), // Charlie
  'user-7': require('../../../../assets/avatars/alien_32.png'), // David
  'user-9': require('../../../../assets/avatars/alien_33.png'), // Emma
  'user-12': require('../../../../assets/avatars/alien_34.png'), // Frank
  
  // Social post authors (by handle/username, without @)
  'marketwizard': require('../../../../assets/avatars/alien_35.png'), // Market Analyst
  'cryptonews': require('../../../../assets/avatars/alien_36.png'), // Crypto Insider
  'techstocks': require('../../../../assets/avatars/alien_37.png'), // Tech Trader
  'marketwatch': require('../../../../assets/avatars/alien_38.png'), // Market Watch
};

/**
 * Get avatar image source for a user
 * @param userId - User ID (e.g., '1', 'user-1')
 * @param username - Username or handle (e.g., 'CryptoKing', 'marketwizard')
 * @returns Image source number or null if not found
 */
export const getAvatarSource = (userId?: string, username?: string): number | null => {
  if (!userId && !username) return null;

  // Try by userId first
  if (userId && avatarImages[userId] !== null && avatarImages[userId] !== undefined) {
    return avatarImages[userId] as number;
  }

  // Try by username (normalized: lowercase, no spaces, no @)
  if (username) {
    const normalizedUsername = username.toLowerCase().replace(/[@\s]/g, '');
    if (avatarImages[normalizedUsername] !== null && avatarImages[normalizedUsername] !== undefined) {
      return avatarImages[normalizedUsername] as number;
    }
  }

  return null;
};

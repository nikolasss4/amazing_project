# Profile Avatar Images

This directory contains profile avatar images for users in the community feature.

## Image Specifications

- **Format:** PNG
- **Aspect Ratio:** 1:1 (square)
- **Recommended Size:** 128x128px or higher (for Retina displays)
- **Naming Convention:** Use lowercase, no spaces (e.g., `cryptoking.png`, `wallstreetbear.png`)

## File Naming

Images should be named according to the user identifier:

### Leaderboard Users (by userId)
- `cryptoking.png` (userId: '1')
- `wallstreetbear.png` (userId: '2')
- `techbull.png` (userId: '3')
- `daytraderpro.png` (userId: '4')
- `swingmaster.png` (userId: '5')
- `tradeguru.png` (userId: '6')
- `marketwhiz.png` (userId: '7')
- `profitseeker.png` (userId: '8')
- `bullrun.png` (userId: '9')
- `stockmaster.png` (userId: '10')
- `alphatrader.png` (userId: '11')
- `tradingpro.png` (userId: '12')
- `marketmaven.png` (userId: '13')
- `tradeexpert.png` (userId: '14')
- `profithunter.png` (userId: '15')
- `bulltrader.png` (userId: '16')
- `stockwizard.png` (userId: '17')
- `tradeking.png` (userId: '18')
- `marketgenius.png` (userId: '19')
- `profitpro.png` (userId: '20')
- `bullmaster.png` (userId: '21')
- `stockexpert.png` (userId: '22')
- `tradehero.png` (userId: '23')
- `marketsleader.png` (userId: '24')
- `profitchamp.png` (userId: '25')

### Friends Leaderboard Users
- `alice.png` (userId: 'user-1')
- `bob.png` (userId: 'user-2')
- `charlie.png` (userId: 'user-4')
- `david.png` (userId: 'user-7')
- `emma.png` (userId: 'user-9')
- `frank.png` (userId: 'user-12')

### Social Post Authors (by handle)
- `marketwizard.png` (handle: '@marketwizard')
- `cryptonews.png` (handle: '@cryptonews')
- `techstocks.png` (handle: '@techstocks')
- `marketwatch.png` (handle: '@marketwatch')

## Adding New Images

1. Place your PNG files in this directory with the appropriate names
2. The Avatar component will automatically use them if they match the naming convention
3. If an image is missing, the component will fall back to displaying initials

## Notes

- Images are automatically masked into circles by the Avatar component
- Square images work best for circular avatars
- The component handles different sizes (32px for leaderboard, 40px for posts, etc.)

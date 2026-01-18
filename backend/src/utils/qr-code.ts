/**
 * QR Code Utilities
 * 
 * QR codes are encoded as: "risklaba:friend:userId"
 * The QR code contains the user's UUID for friend addition.
 * In production, you might want to use a more secure format like:
 * - Encrypted user ID
 * - Time-limited tokens
 * - Signed payloads
 */

export interface QRData {
  type: 'friend';
  userId: string;
}

const QR_PREFIX = 'risklaba:friend:';

/**
 * Encode userId into QR code format
 */
export function encodeQRCode(userId: string): string {
  return `${QR_PREFIX}${userId}`;
}

/**
 * Decode QR code string to extract userId
 */
export function decodeQRCode(qrData: string): QRData | null {
  if (!qrData.startsWith(QR_PREFIX)) {
    return null;
  }

  const userId = qrData.substring(QR_PREFIX.length);
  if (!userId || userId.length === 0) {
    return null;
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return null;
  }

  return {
    type: 'friend',
    userId,
  };
}


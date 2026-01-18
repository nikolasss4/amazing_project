import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-here',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
  useGemini: process.env.USE_GEMINI === 'true', // Set USE_GEMINI=true to use Gemini instead of OpenAI
};


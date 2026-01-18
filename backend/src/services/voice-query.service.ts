/**
 * Voice Query Service
 * Handles speech-to-text, multimodal LLM analysis, and text-to-speech
 */

import FormData from 'form-data';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice

export interface VoiceQueryRequest {
  screenshotBase64: string;
  audioBase64?: string; // Optional - can send transcript directly
  transcript?: string; // If frontend does STT, send transcript here
  page: string;
}

export interface VoiceQueryResponse {
  audioBase64: string;
  transcript: string;
  responseText: string;
}

/**
 * Step 1: Speech-to-Text using ElevenLabs Scribe API
 */
async function speechToText(audioBase64: string): Promise<string> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is required for speech-to-text');
    }

    console.log('Attempting ElevenLabs Scribe transcription, audio buffer size:', audioBase64.length);
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // ElevenLabs Speech-to-Text API endpoint (Scribe v2)
    const url = 'https://api.elevenlabs.io/v1/speech-to-text';
    
    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });
    formData.append('model_id', 'scribe_v2'); // Use Scribe v2 model
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        ...formData.getHeaders(), // Get headers for multipart/form-data
      },
      body: formData as any, // FormData is compatible with fetch body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs STT API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // ElevenLabs STT returns text in the 'text' field
    const transcript = data.text;
    
    if (!transcript) {
      throw new Error('No transcript returned from ElevenLabs STT API');
    }

    console.log('ElevenLabs Scribe transcription successful:', transcript.substring(0, 100));
    return transcript;
  } catch (error: any) {
    console.error('Speech-to-text error:', error);
    console.error('Error message:', error.message);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Step 2: Multimodal LLM Analysis using GPT-4 Vision or Google Gemini
 */
async function analyzeWithVision(transcript: string, screenshotBase64: string, page: string): Promise<string> {
  const useGemini = process.env.USE_GEMINI === 'true';
  const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
  
  if (useGemini && geminiApiKey) {
    // Use Google Gemini
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `You are a market analysis assistant for a crypto trading community app.
You are given a screenshot of the app interface and a user's voice question.
Only analyze what is visible on screen.
If data is weak or low confidence, say so explicitly.
Never infer price action if not shown.
Never upgrade confidence beyond UI data.
Say "insufficient data" when needed.
Anchor every answer to visible elements.
Be honest, grounded, and demo-safe.

User question: "${transcript}"
Current page: ${page}

Analyze the screenshot and answer the question based only on what is visible.`
              },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: screenshotBase64
                }
              }
            ]
          }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || 'I could not analyze the screenshot.';
    } catch (error: any) {
      console.error('Gemini LLM analysis error:', error);
      throw new Error(`Failed to analyze with Gemini: ${error.message}`);
    }
  } else {
    // Gemini is required (OpenAI removed)
    throw new Error('USE_GEMINI=true and GOOGLE_GEMINI_API_KEY are required. OpenAI has been removed.');
  }
}

/**
 * Step 3: Text-to-Speech using ElevenLabs
 */
async function textToSpeech(text: string): Promise<string> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return audioBase64;
  } catch (error: any) {
    console.error('Text-to-speech error:', error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

/**
 * Main voice query handler
 */
export async function processVoiceQuery(request: VoiceQueryRequest): Promise<VoiceQueryResponse> {
  try {
    let transcript: string;
    
    // Step 1: Speech-to-Text (use transcript if provided, otherwise transcribe audio)
    if (request.transcript) {
      transcript = request.transcript;
      console.log('Using frontend-provided transcript:', transcript);
    } else if (request.audioBase64) {
      transcript = await speechToText(request.audioBase64);
      console.log('Transcript from ElevenLabs Scribe:', transcript);
    } else {
      throw new Error('Either audioBase64 or transcript must be provided');
    }

    // Step 2: Multimodal LLM Analysis
    const responseText = await analyzeWithVision(transcript, request.screenshotBase64, request.page);
    console.log('LLM Response:', responseText);

    // Step 3: Text-to-Speech
    const audioBase64 = await textToSpeech(responseText);

    return {
      audioBase64,
      transcript,
      responseText,
    };
  } catch (error: any) {
    console.error('Voice query processing error:', error);
    throw error;
  }
}

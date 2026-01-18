/**
 * AssistantService - API interface for AI Assistant
 */

export interface AssistantQueryRequest {
  message: string;
  screenshot?: string; // base64 or file URI
  sessionId?: string;
}

export interface AssistantQueryResponse {
  message: string;
  confidence?: number;
}

export interface VoiceQueryRequest {
  screenshotBase64: string;
  audioBase64?: string; // Optional - if transcript is provided
  transcript?: string; // Optional - if audioBase64 is provided
  page: string;
}

export interface VoiceQueryResponse {
  audioBase64: string;
  transcript: string;
  responseText: string;
}

// API Configuration
// Use 127.0.0.1 instead of localhost for better web compatibility
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

class AssistantServiceClass {
  /**
   * Send text query to AI Assistant (legacy text interface)
   */
  async query(request: AssistantQueryRequest): Promise<AssistantQueryResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock response for text queries (keep for backward compatibility)
    const lowerMessage = request.message.toLowerCase();
    let response = "Thanks for your question! I'm analyzing the screenshot you shared.";
    
    if (lowerMessage.includes('trade') || lowerMessage.includes('buy') || lowerMessage.includes('sell')) {
      response = "I can see you're on the trading screen. To place a trade, select your preferred trading pair from the list, enter the amount you want to trade, and tap the buy or sell button. Always review your order details before confirming!";
    } else if (lowerMessage.includes('learn') || lowerMessage.includes('scenario')) {
      response = "The Learn section uses real-world scenarios to help you understand market dynamics. Each correct answer earns you XP and builds your streak.";
    } else if (lowerMessage.includes('community') || lowerMessage.includes('leaderboard')) {
      response = "The Community page shows top traders on the leaderboard, celebrity portfolio insights, and social sentiment.";
    }

    return {
      message: response,
      confidence: 0.85,
    };
  }

  /**
   * Send voice query with screenshot
   */
  async voiceQuery(request: VoiceQueryRequest, userId?: string): Promise<VoiceQueryResponse> {
    try {
      const url = `${API_BASE_URL}/api/voice/query`;
      const userIdHeader = userId || 'demo-user-001';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userIdHeader, // Always send userId header
        },
        body: JSON.stringify({
          screenshotBase64: request.screenshotBase64,
          audioBase64: request.audioBase64,
          transcript: request.transcript, // Include transcript when using Web Speech API
          page: request.page,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        audioBase64: data.audioBase64,
        transcript: data.transcript,
        responseText: data.responseText,
      };
    } catch (error: any) {
      console.error('AssistantService voiceQuery error:', error);
      throw error;
    }
  }
}

export const AssistantService = new AssistantServiceClass();

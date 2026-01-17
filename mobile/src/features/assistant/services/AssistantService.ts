/**
 * AssistantService - API interface for AI Assistant
 * Mock implementation for MVP, designed to be replaced with real backend
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

// Mock responses based on keywords
const getMockResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('trade') || lowerMessage.includes('buy') || lowerMessage.includes('sell')) {
    return "I can see you're on the trading screen. To place a trade, select your preferred trading pair from the list, enter the amount you want to trade, and tap the buy or sell button. Always review your order details before confirming!";
  }

  if (lowerMessage.includes('learn') || lowerMessage.includes('scenario')) {
    return "The Learn section uses real-world scenarios to help you understand market dynamics. Each correct answer earns you XP and builds your streak. Take your time to think through each scenario—understanding the 'why' is more important than speed!";
  }

  if (lowerMessage.includes('community') || lowerMessage.includes('leaderboard')) {
    return "The Community page shows top traders on the leaderboard, celebrity portfolio insights, and social sentiment. Use this information to learn from others, but remember—always do your own research before making trading decisions!";
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return "I'm here to help! I can explain features, guide you through the app, and answer questions about trading concepts. Just ask me anything, and I'll do my best to assist you.";
  }

  if (lowerMessage.includes('balance') || lowerMessage.includes('money') || lowerMessage.includes('deposit')) {
    return "Your account balance is displayed at the top of the Trade screen. To add funds, you would typically go to your account settings and select a deposit method. Note: This is a demo environment with mock balances for learning purposes.";
  }

  return "Thanks for your question! I'm analyzing the screenshot you shared. In a production environment, I would use advanced AI to understand the context and provide specific guidance. For now, feel free to ask me about trading, learning scenarios, or navigating the app!";
};

class AssistantServiceClass {
  /**
   * Send query to AI Assistant
   * TODO: Replace with real API endpoint
   */
  async query(request: AssistantQueryRequest): Promise<AssistantQueryResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock response
    const response = getMockResponse(request.message);

    return {
      message: response,
      confidence: 0.85,
    };
  }

  /**
   * API Configuration
   * TODO: Set these via environment variables or app config
   */
  private apiEndpoint = 'https://api.risklaba.com/v1/assistant';
  private apiKey = 'YOUR_API_KEY_HERE';

  /**
   * Real API implementation (commented out for MVP)
   */
  /*
  async queryReal(request: AssistantQueryRequest): Promise<AssistantQueryResponse> {
    try {
      const response = await fetch(`${this.apiEndpoint}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          message: request.message,
          screenshot: request.screenshot,
          session_id: request.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        message: data.message,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error('AssistantService error:', error);
      throw error;
    }
  }
  */
}

export const AssistantService = new AssistantServiceClass();

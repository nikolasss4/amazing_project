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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantService.ts:voiceQuery',message:'Starting voice query API call',data:{apiBaseUrl:API_BASE_URL,hasUserId:!!userId,audioBase64Length:request.audioBase64?.length,screenshotBase64Length:request.screenshotBase64?.length,page:request.page},timestamp:Date.now(),sessionId:'debug-session',runId:'api-call',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    try {
      const url = `${API_BASE_URL}/api/voice/query`;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantService.ts:voiceQuery',message:'Making fetch request',data:{url,method:'POST',hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',runId:'api-call',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      const userIdHeader = userId || 'demo-user-001';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantService.ts:voiceQuery',message:'Fetch request with headers',data:{url,userId,userIdHeader,headers:{'Content-Type':'application/json','x-user-id':userIdHeader}},timestamp:Date.now(),sessionId:'debug-session',runId:'api-call',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userIdHeader, // Always send userId header
        },
        body: JSON.stringify({
          screenshotBase64: request.screenshotBase64,
          audioBase64: request.audioBase64,
          page: request.page,
        }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantService.ts:voiceQuery',message:'Fetch response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'api-call',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const errorText = await response.text();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantService.ts:voiceQuery',message:'API error response',data:{status:response.status,errorText:errorText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'api-call',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantService.ts:voiceQuery',message:'API response parsed',data:{hasTranscript:!!data.transcript,hasResponseText:!!data.responseText,hasAudioBase64:!!data.audioBase64},timestamp:Date.now(),sessionId:'debug-session',runId:'api-call',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      return {
        audioBase64: data.audioBase64,
        transcript: data.transcript,
        responseText: data.responseText,
      };
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantService.ts:voiceQuery',message:'Voice query API error',data:{error:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'api-call',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('AssistantService voiceQuery error:', error);
      throw error;
    }
  }
}

export const AssistantService = new AssistantServiceClass();

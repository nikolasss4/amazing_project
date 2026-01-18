/**
 * Wallet Authentication Service
 * Handles wallet connection and authentication with Pear Protocol
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// Use LAN IP for mobile development - get this from Expo start output
// For iOS Simulator: use 'localhost'
// For Android Emulator: use '10.0.2.2'
// For physical device: use your machine's LAN IP (e.g., '10.0.11.138')
// For web: use 'localhost'
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  // For mobile devices, use LAN IP
  return 'http://10.0.11.138:8000';
};

const API_BASE_URL = getApiBaseUrl();

const STORAGE_KEY_ACCESS_TOKEN = '@pear_access_token';
const STORAGE_KEY_REFRESH_TOKEN = '@pear_refresh_token';
const STORAGE_KEY_WALLET_ADDRESS = '@wallet_address';

export interface EIP712Message {
  primaryType?: string;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    [key: string]: Array<{
      name: string;
      type: string;
    }>;
  };
  message: {
    address: string;
    clientId: string;
    timestamp: number;
    action: string;
  };
  timestamp: number; // Root level timestamp from Pear API response
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type: string;
}

export interface AgentWalletResponse {
  address: string | null;
  status: 'NOT_FOUND' | 'ACTIVE' | 'EXPIRED';
  expires_at: string | null;
  created_at: string | null;
}

class WalletService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private walletAddress: string | null = null;

  /**
   * Initialize service - load tokens from storage
   */
  async initialize(): Promise<void> {
    try {
      this.accessToken = await AsyncStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      this.refreshToken = await AsyncStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
      this.walletAddress = await AsyncStorage.getItem(STORAGE_KEY_WALLET_ADDRESS);
    } catch (error) {
      console.error('Failed to initialize wallet service:', error);
    }
  }

  /**
   * Get EIP-712 message for wallet signature
   */
  async getEIP712Message(address: string): Promise<EIP712Message> {
    const url = `${API_BASE_URL}/api/trade/pear/auth/eip712-message`;
    console.log('\n' + '='.repeat(80));
    console.log('🔐 STEP 1: Getting EIP-712 message');
    console.log('='.repeat(80));
    console.log('📍 Address:', address);
    console.log('🌐 Platform:', Platform.OS);
    console.log('📡 API Base URL:', API_BASE_URL);
    console.log('📡 Full URL:', url);
    console.log('📦 Params:', { address: address.toLowerCase(), clientId: 'HLHackathon1' });
    
    try {
      console.log('⏳ Making GET request...');
      const response = await axios.get(url, {
        params: {
          address: address.toLowerCase(),
          clientId: 'HLHackathon1'
        },
        timeout: 10000, // 10 second timeout
      });
      console.log('✅ Response received!');
      console.log('📊 Status:', response.status);
      console.log('📦 Data:', JSON.stringify(response.data, null, 2));
      console.log('='.repeat(80) + '\n');
      return response.data;
    } catch (error: any) {
      console.error('❌ FAILED to get EIP-712 message');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      if (error.code) {
        console.error('Error code:', error.code);
      }
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received!');
        console.error('Request config:', {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        });
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      console.log('='.repeat(80) + '\n');
      
      throw new Error(`Failed to get authentication message: ${error.message}`);
    }
  }

  /**
   * Simulate wallet signature
   * In production, this would use WalletConnect or similar
   */
  async signMessage(eip712Data: EIP712Message, walletAddress: string): Promise<string> {
    console.log('\n' + '='.repeat(80));
    console.log('✍️  STEP 2: Signing EIP-712 message');
    console.log('='.repeat(80));
    console.log('📍 Wallet:', walletAddress);
    console.log('📋 Domain:', eip712Data.domain.name);
    console.log('📋 Chain ID:', eip712Data.domain.chainId);
    console.log('⚠️  Using MOCK signature (production would use WalletConnect)');
    
    // TODO: Integrate with actual wallet provider (WalletConnect, MetaMask Mobile, etc.)
    // In production, you would use something like:
    // const provider = await WalletConnect.connect();
    // const signer = provider.getSigner();
    // const signature = await signer._signTypedData(
    //   eip712Data.domain,
    //   eip712Data.types,
    //   eip712Data.message
    // );

    // Mock signature for development
    const mockSignature = '0x' + 'a'.repeat(130);
    console.log('✅ Mock signature generated:', mockSignature.substring(0, 20) + '...');
    console.log('='.repeat(80) + '\n');
    return mockSignature;
  }

  /**
   * Authenticate with Pear Protocol using wallet signature
   */
  async authenticateWithSignature(
    walletAddress: string,
    signature: string,
    timestamp: number
  ): Promise<AuthTokens> {
    const url = `${API_BASE_URL}/api/trade/pear/auth/login`;
    console.log('\n' + '='.repeat(80));
    console.log('🔑 STEP 3: Authenticating with signature');
    console.log('='.repeat(80));
    console.log('📍 Address:', walletAddress);
    console.log('📡 URL:', url);
    console.log('✍️  Signature:', signature.substring(0, 20) + '...');
    console.log('🕐 Timestamp:', timestamp);
    
    try {
      console.log('⏳ Making POST request...');
      const response = await axios.post(url, {
        method: 'eip712',
        address: walletAddress.toLowerCase(),
        clientId: 'HLHackathon1',
        details: { signature, timestamp }
      }, {
        timeout: 10000,
      });

      console.log('✅ Authentication successful!');
      console.log('📊 Status:', response.status);
      console.log('='.repeat(80) + '\n');
      const tokens: AuthTokens = response.data;

      // Store tokens
      await this.storeTokens(tokens, walletAddress);

      return tokens;
    } catch (error: any) {
      console.error('❌ Authentication failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      if (error.response?.status === 500) {
        throw new Error('Authentication service is unavailable. Please try again later.');
      }
      
      throw new Error('Failed to authenticate with wallet');
    }
  }

  /**
   * Complete wallet connection flow
   */
  async connectWallet(walletAddress: string): Promise<boolean> {
    console.log('🚀 Starting wallet connection for:', walletAddress);
    
    try {
      // 1. Get EIP-712 message
      console.log('Step 1/4: Getting EIP-712 message...');
      const eip712Data = await this.getEIP712Message(walletAddress);

      // 2. Sign message with wallet
      console.log('Step 2/4: Signing message...');
      const signature = await this.signMessage(eip712Data, walletAddress);

      // 3. Authenticate with Pear Protocol
      // Use root-level timestamp from response, fallback to message.timestamp
      const timestamp = eip712Data.timestamp || eip712Data.message.timestamp;
      console.log('Step 3/4: Authenticating...');
      const tokens = await this.authenticateWithSignature(walletAddress, signature, timestamp);

      // 4. Check/create agent wallet
      console.log('Step 4/4: Setting up agent wallet...');
      await this.ensureAgentWallet();

      console.log('✅ Wallet connection completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY_ACCESS_TOKEN,
        STORAGE_KEY_REFRESH_TOKEN,
        STORAGE_KEY_WALLET_ADDRESS,
      ]);
      
      this.accessToken = null;
      this.refreshToken = null;
      this.walletAddress = null;
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }

  /**
   * Store authentication tokens
   */
  private async storeTokens(tokens: AuthTokens, walletAddress: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEY_ACCESS_TOKEN, tokens.access_token],
        [STORAGE_KEY_REFRESH_TOKEN, tokens.refresh_token],
        [STORAGE_KEY_WALLET_ADDRESS, walletAddress.toLowerCase()],
      ]);

      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      this.walletAddress = walletAddress.toLowerCase();
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/trade/pear/auth/refresh`,
        { refresh_token: this.refreshToken }
      );

      const tokens: AuthTokens = response.data;
      await AsyncStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, tokens.access_token);
      await AsyncStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, tokens.refresh_token);

      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, clear all tokens
      await this.disconnectWallet();
      throw new Error('Session expired. Please reconnect your wallet.');
    }
  }

  /**
   * Get agent wallet status
   */
  async getAgentWallet(): Promise<AgentWalletResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/trade/pear/agent-wallet`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Try to refresh token
        await this.refreshAccessToken();
        // Retry request
        const response = await axios.get(
          `${API_BASE_URL}/api/trade/pear/agent-wallet`,
          {
            headers: { Authorization: `Bearer ${this.accessToken}` }
          }
        );
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Create agent wallet
   */
  async createAgentWallet(): Promise<AgentWalletResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/trade/pear/agent-wallet`,
        {},
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create agent wallet:', error);
      throw new Error('Failed to create trading wallet');
    }
  }

  /**
   * Ensure agent wallet exists and is active
   */
  async ensureAgentWallet(): Promise<void> {
    try {
      const wallet = await this.getAgentWallet();

      if (wallet.status === 'NOT_FOUND' || wallet.status === 'EXPIRED') {
        // Create new agent wallet
        await this.createAgentWallet();
        // In production, would need user to approve the agent wallet
        // by signing another message
      }
    } catch (error) {
      console.error('Failed to ensure agent wallet:', error);
      // Don't throw - wallet can still be connected even if agent wallet fails
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return !!(this.accessToken && this.walletAddress);
  }

  /**
   * Get connected wallet address
   */
  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Format wallet address for display (e.g., 0x742d...0bEb)
   */
  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Validate Ethereum address format
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

export default new WalletService();

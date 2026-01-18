import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Trade Store
import { TradePair, TradeTheme } from '../../features/trade/models';

// API Base URL
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  // For mobile devices, use LAN IP
  return 'http://10.0.11.138:8000';
};

interface TradeState {
  selectedTheme: TradeTheme | null;
  selectedPair: TradePair | null;
  tradeType: 'theme' | 'pair' | 'single' | 'basket';
  orderType: 'market' | 'limit';
  amount: string;
  side: 'long' | 'short';
  // For pair trading - user selected assets
  selectedLongAsset: string | null;
  selectedShortAsset: string | null;
  setSelectedTheme: (theme: TradeTheme | null) => void;
  setSelectedPair: (pair: TradePair | null) => void;
  setTradeType: (type: 'theme' | 'pair' | 'single' | 'basket') => void;
  setOrderType: (type: 'market' | 'limit') => void;
  setAmount: (amount: string) => void;
  setSide: (side: 'long' | 'short') => void;
  setSelectedLongAsset: (asset: string | null) => void;
  setSelectedShortAsset: (asset: string | null) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedTheme: null,
  selectedPair: null,
  tradeType: 'pair',
  orderType: 'market',
  amount: '',
  side: 'long',
  selectedLongAsset: null,
  selectedShortAsset: null,
  setSelectedTheme: (theme) => set({ selectedTheme: theme }),
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setTradeType: (type) => set({ tradeType: type }),
  setOrderType: (type) => set({ orderType: type }),
  setAmount: (amount) => set({ amount }),
  setSide: (side) => set({ side }),
  setSelectedLongAsset: (asset) => set({ selectedLongAsset: asset }),
  setSelectedShortAsset: (asset) => set({ selectedShortAsset: asset }),
}));

// Learn Store
export interface Scenario {
  id: string;
  prompt: string;
  chartImage?: string;
  options: Array<'up' | 'down'>;
  correctAnswer: 'up' | 'down';
  explanation: string;
  xpReward: number;
}

interface LearnState {
  currentScenario: Scenario | null;
  totalXP: number;
  streak: number;
  answeredToday: number;
  setCurrentScenario: (scenario: Scenario | null) => void;
  addXP: (xp: number) => void;
  incrementStreak: () => void;
}

export const useLearnStore = create<LearnState>((set) => ({
  currentScenario: null,
  totalXP: 0,
  streak: 0,
  answeredToday: 0,
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),
  addXP: (xp) => set((state) => ({ totalXP: state.totalXP + xp })),
  incrementStreak: () =>
    set((state) => ({ streak: state.streak + 1, answeredToday: state.answeredToday + 1 })),
}));

// Improve Store
interface ImproveState {
  currentScenario: Scenario | null;
  totalXP: number;
  streak: number;
  answeredToday: number;
  correctAnswers: number;
  setCurrentScenario: (scenario: Scenario | null) => void;
  addXP: (xp: number) => void;
  incrementStreak: () => void;
  incrementCorrect: () => void;
  resetStreak: () => void;
}

export const useImproveStore = create<ImproveState>((set) => ({
  currentScenario: null,
  totalXP: 0,
  streak: 0,
  answeredToday: 0,
  correctAnswers: 0,
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),
  addXP: (xp) => set((state) => ({ totalXP: state.totalXP + xp })),
  incrementStreak: () =>
    set((state) => ({ streak: state.streak + 1, answeredToday: state.answeredToday + 1 })),
  incrementCorrect: () => set((state) => ({ correctAnswers: state.correctAnswers + 1 })),
  resetStreak: () => set({ streak: 0 }),
}));

// AI Assistant Store
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  screenshot?: string;
}

interface AssistantState {
  isOpen: boolean;
  messages: Message[];
  screenshotUri: string | null;
  setIsOpen: (isOpen: boolean) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setScreenshot: (uri: string | null) => void;
  clearChat: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  isOpen: false,
  messages: [],
  screenshotUri: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Date.now().toString(),
          timestamp: new Date(),
        },
      ],
    })),
  setScreenshot: (uri) => set({ screenshotUri: uri }),
  clearChat: () => set({ messages: [], screenshotUri: null }),
}));

// Wallet Store
const WALLET_ADDRESS_KEY = '@wallet_address';
const ACCESS_TOKEN_KEY = '@access_token';

interface WalletState {
  walletAddress: string | null;
  accessToken: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (address: string) => Promise<void>;
  disconnect: () => Promise<void>;
  initialize: () => Promise<void>;
  getAccessToken: () => string | null;
}

const isValidEthAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const useWalletStore = create<WalletState>((set, get) => ({
  walletAddress: null,
  accessToken: null,
  isConnected: false,
  isConnecting: false,
  
  connect: async (address: string) => {
    // Validate address format
    const trimmedAddress = address.trim();
    if (!isValidEthAddress(trimmedAddress)) {
      throw new Error('Invalid wallet address format. Please enter a valid Ethereum address (0x...)');
    }
    
    // Set connecting state
    set({ isConnecting: true });
    
    console.log('\n' + '='.repeat(80));
    console.log('🔐 WALLET AUTHENTICATION STARTED');
    console.log('='.repeat(80));
    console.log('📍 Address:', trimmedAddress);
    console.log('🌐 Platform:', Platform.OS);
    
    try {
      // Call the complete authentication endpoint
      const apiUrl = getApiBaseUrl();
      const authUrl = `${apiUrl}/api/trade/pear/auth/authenticate-wallet?address=${trimmedAddress}`;
      
      console.log('📡 Calling complete authentication endpoint...');
      console.log('🔗 Full URL:', authUrl);
      console.log('⏳ Authenticating with Pear Protocol...');
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Authentication request failed!');
        console.error('❌ Error response:', errorText);
        set({ isConnecting: false });
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }
      
      const authResult = await response.json();
      console.log('\n' + '='.repeat(80));
      console.log('✅ AUTHENTICATION RESPONSE');
      console.log('='.repeat(80));
      console.log(JSON.stringify(authResult, null, 2));
      console.log('='.repeat(80) + '\n');
      
      // Only connect if authentication was successful
      if (authResult.success && authResult.authenticated) {
        const accessToken = authResult.accessToken || null;
        
        // Store wallet address and access token
        await AsyncStorage.setItem(WALLET_ADDRESS_KEY, trimmedAddress);
        if (accessToken) {
          await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
          console.log('✅ Access token stored:', accessToken.substring(0, 20) + '...');
        }
        
        // Update state
        set({ 
          walletAddress: trimmedAddress,
          accessToken: accessToken,
          isConnected: true,
          isConnecting: false
        });
        
        console.log('✅ Wallet authenticated and connected:', trimmedAddress);
        console.log('='.repeat(80) + '\n');
      } else {
        // Authentication failed
        set({ isConnecting: false });
        const errorMsg = authResult.error || authResult.message || 'Authentication failed';
        console.error('❌ Authentication failed:', errorMsg);
        console.log('='.repeat(80) + '\n');
        throw new Error(errorMsg);
      }
    } catch (error) {
      set({ isConnecting: false });
      console.error('❌ Failed to authenticate wallet:', error);
      console.log('='.repeat(80) + '\n');
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to authenticate wallet');
    }
  },
  
  disconnect: async () => {
    try {
      // Clear from AsyncStorage
      await AsyncStorage.removeItem(WALLET_ADDRESS_KEY);
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      
      // Reset state
      set({ 
        walletAddress: null,
        accessToken: null,
        isConnected: false 
      });
      
      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw new Error('Failed to disconnect wallet');
    }
  },
  
  initialize: async () => {
    try {
      // Load from AsyncStorage on app start
      const savedAddress = await AsyncStorage.getItem(WALLET_ADDRESS_KEY);
      const savedToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      
      if (savedAddress && isValidEthAddress(savedAddress)) {
        set({ 
          walletAddress: savedAddress,
          accessToken: savedToken,
          isConnected: true 
        });
        console.log('✅ Wallet restored from storage:', savedAddress);
        if (savedToken) {
          console.log('✅ Access token restored:', savedToken.substring(0, 20) + '...');
        }
      } else {
        console.log('ℹ️ No saved wallet found');
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  },
  
  getAccessToken: () => {
    return get().accessToken;
  },
}));

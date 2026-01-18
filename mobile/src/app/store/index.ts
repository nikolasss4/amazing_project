import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Trade Store
import { TradePair, TradeTheme } from '../../features/trade/models';

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
  streak: 7,
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
import { Platform } from 'react-native';

const WALLET_ADDRESS_KEY = '@wallet_address';
const ACCESS_TOKEN_KEY = '@access_token';
const PRIVATE_KEY_KEY = '@private_key';

// Dynamic API Base URL for wallet auth
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  // For mobile devices, use LAN IP
  return 'http://10.0.11.138:8000';
};

type AuthStep = 'idle' | 'getting_message' | 'signing' | 'authenticating' | 'setting_up_wallet' | 'complete';

interface WalletState {
  walletAddress: string | null;
  privateKey: string | null;
  isConnected: boolean;
  isAuthenticating: boolean;
  isConnecting: boolean;
  authStep: AuthStep;
  error: string | null;
  accessToken: string | null;
  authError: string | null;
  connect: (address: string, privateKey?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  initialize: () => Promise<void>;
  getAccessToken: () => string | null;
  getPrivateKey: () => string | null;
}

const isValidEthAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const isValidPrivateKey = (key: string): boolean => {
  // Private key should be 64 hex characters (without 0x prefix) or 66 with 0x prefix
  const cleanKey = key.startsWith('0x') ? key.slice(2) : key;
  return /^[a-fA-F0-9]{64}$/.test(cleanKey);
};

export const useWalletStore = create<WalletState>((set, get) => ({
  walletAddress: null,
  privateKey: null,
  isConnected: false,
  isAuthenticating: false,
  isConnecting: false,
  authStep: 'idle' as AuthStep,
  error: null,
  accessToken: null,
  authError: null,
  
  connect: async (address: string, privateKey?: string) => {
    // Validate address format
    const trimmedAddress = address.trim();
    if (!isValidEthAddress(trimmedAddress)) {
      throw new Error('Invalid wallet address format. Please enter a valid Ethereum address (0x...)');
    }
    
    // Private key is optional now
    const trimmedPrivateKey = privateKey?.trim() || '';
    if (trimmedPrivateKey && !isValidPrivateKey(trimmedPrivateKey)) {
      throw new Error('Invalid private key format. Please enter a valid 64-character hex private key.');
    }
    
    set({ isAuthenticating: true, isConnecting: true, authStep: 'getting_message', error: null, authError: null });
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      console.log('\n' + '='.repeat(80));
      console.log('WALLET CONNECT - Calling backend authentication');
      console.log('='.repeat(80));
      console.log('Platform:', Platform.OS);
      console.log('API URL:', apiBaseUrl);
      console.log('Address:', trimmedAddress);
      console.log('Private Key:', trimmedPrivateKey.substring(0, 8) + '...' + trimmedPrivateKey.substring(trimmedPrivateKey.length - 4));
      
      // Call backend to authenticate the wallet with private key
      const authUrl = `${apiBaseUrl}/api/trade/pear/auth/authenticate-wallet`;
      console.log('Auth URL:', authUrl);
      console.log('Making POST request...');
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: trimmedAddress,
          privateKey: trimmedPrivateKey,
        }),
      });
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', JSON.stringify(result, null, 2));
      console.log('='.repeat(80) + '\n');
      
      if (!result.success) {
        const errorMsg = result.error || result.message || 'Authentication failed';
        set({ isAuthenticating: false, isConnecting: false, authStep: 'idle', error: errorMsg, authError: errorMsg });
        throw new Error(errorMsg);
      }
      
      set({ authStep: 'setting_up_wallet' });
      
      // Store tokens, address, and private key in AsyncStorage for persistence
      await AsyncStorage.setItem(WALLET_ADDRESS_KEY, trimmedAddress);
      await AsyncStorage.setItem(PRIVATE_KEY_KEY, trimmedPrivateKey);
      if (result.accessToken) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
      }
      
      // Update state
      set({ 
        walletAddress: trimmedAddress,
        privateKey: trimmedPrivateKey,
        isConnected: true,
        isAuthenticating: false,
        isConnecting: false,
        authStep: 'complete',
        error: null,
        accessToken: result.accessToken || null,
        authError: null,
      });
      
      console.log('Wallet connected and authenticated:', trimmedAddress);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to authenticate wallet';
      set({ isAuthenticating: false, isConnecting: false, authStep: 'idle', error: errorMsg });
      throw error instanceof Error ? error : new Error('Failed to authenticate wallet');
    }
  },
  
  disconnect: async () => {
    try {
      // Clear from AsyncStorage
      await AsyncStorage.multiRemove([WALLET_ADDRESS_KEY, ACCESS_TOKEN_KEY, PRIVATE_KEY_KEY]);
      
      // Reset state
      set({ 
        walletAddress: null,
        privateKey: null,
        isConnected: false,
        isConnecting: false,
        authStep: 'idle' as AuthStep,
        error: null,
        accessToken: null,
        authError: null,
      });
      
      console.log('Wallet disconnected');
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
      const savedPrivateKey = await AsyncStorage.getItem(PRIVATE_KEY_KEY);
      
      if (savedAddress && isValidEthAddress(savedAddress)) {
        set({ 
          walletAddress: savedAddress,
          privateKey: savedPrivateKey,
          isConnected: true,
          accessToken: savedToken,
        });
        console.log('Wallet restored from storage:', savedAddress);
      } else {
        console.log('No saved wallet found');
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  },
  
  getAccessToken: () => {
    return get().accessToken;
  },
  
  getPrivateKey: () => {
    return get().privateKey;
  },
}));

// User Store
interface UserStore {
  userId: string | null;
  username: string | null;
  setUser: (userId: string, username: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  userId: null,
  username: null,
  setUser: (userId: string, username: string) => set({ userId, username }),
  clearUser: () => set({ userId: null, username: null }),
}));

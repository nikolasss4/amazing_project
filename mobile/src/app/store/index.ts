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

interface WalletState {
  walletAddress: string | null;
  isConnected: boolean;
  connect: (address: string) => Promise<void>;
  disconnect: () => Promise<void>;
  initialize: () => Promise<void>;
}

const isValidEthAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const useWalletStore = create<WalletState>((set) => ({
  walletAddress: null,
  isConnected: false,
  
  connect: async (address: string) => {
    // Validate address format
    const trimmedAddress = address.trim();
    if (!isValidEthAddress(trimmedAddress)) {
      throw new Error('Invalid wallet address format. Please enter a valid Ethereum address (0x...)');
    }
    
    try {
      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem(WALLET_ADDRESS_KEY, trimmedAddress);
      
      // Update state
      set({ 
        walletAddress: trimmedAddress,
        isConnected: true 
      });
      
      console.log('✅ Wallet connected:', trimmedAddress);
    } catch (error) {
      console.error('Failed to save wallet address:', error);
      throw new Error('Failed to save wallet address');
    }
  },
  
  disconnect: async () => {
    try {
      // Clear from AsyncStorage
      await AsyncStorage.removeItem(WALLET_ADDRESS_KEY);
      
      // Reset state
      set({ 
        walletAddress: null,
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
      
      if (savedAddress && isValidEthAddress(savedAddress)) {
        set({ 
          walletAddress: savedAddress,
          isConnected: true 
        });
        console.log('✅ Wallet restored from storage:', savedAddress);
      } else {
        console.log('ℹ️ No saved wallet found');
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  },
}));

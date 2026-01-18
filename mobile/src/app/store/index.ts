import { create } from 'zustand';

// Trade Store
import { TradePair, TradeTheme } from '../../features/trade/models';

interface TradeState {
  selectedTheme: TradeTheme | null;
  selectedPair: TradePair | null;
  tradeType: 'theme' | 'pair' | 'single';
  orderType: 'market' | 'limit';
  amount: string;
  side: 'long' | 'short';
  setSelectedTheme: (theme: TradeTheme | null) => void;
  setSelectedPair: (pair: TradePair | null) => void;
  setTradeType: (type: 'theme' | 'pair' | 'single') => void;
  setOrderType: (type: 'market' | 'limit') => void;
  setAmount: (amount: string) => void;
  setSide: (side: 'long' | 'short') => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedTheme: null,
  selectedPair: null,
  tradeType: 'theme',
  orderType: 'market',
  amount: '',
  side: 'long',
  setSelectedTheme: (theme) => set({ selectedTheme: theme }),
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setTradeType: (type) => set({ tradeType: type }),
  setOrderType: (type) => set({ orderType: type }),
  setAmount: (amount) => set({ amount }),
  setSide: (side) => set({ side }),
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


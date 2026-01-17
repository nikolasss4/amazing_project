export interface Scenario {
  id: string;
  prompt: string;
  chartImage?: string;
  options: Array<'up' | 'down' | 'flat'>;
  correctAnswer: 'up' | 'down' | 'flat';
  explanation: string;
  xpReward: number;
}

// Mock scenarios
export const mockScenarios: Scenario[] = [
  {
    id: '1',
    prompt: 'Company reports earnings beat with revenue up 25% YoY, but lowers forward guidance due to supply chain concerns.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'down',
    explanation: 'While the earnings beat is positive, lowered guidance typically weighs more heavily on stock price. Investors price in future expectations.',
    xpReward: 10,
  },
  {
    id: '2',
    prompt: 'Fed announces interest rate cut of 50 basis points, signaling concerns about economic slowdown.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'up',
    explanation: 'Rate cuts make borrowing cheaper and increase liquidity, generally positive for risk assets like stocks in the short term.',
    xpReward: 10,
  },
  {
    id: '3',
    prompt: 'Tech company announces $10B stock buyback program while reporting inline quarterly results.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'up',
    explanation: 'Large buyback programs reduce share count and signal confidence from management, typically supporting stock price.',
    xpReward: 10,
  },
  {
    id: '4',
    prompt: 'Oil prices surge 15% after major OPEC production cut announcement.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'up',
    explanation: 'For energy stocks, rising oil prices directly improve profit margins and revenue, leading to stock appreciation.',
    xpReward: 10,
  },
  {
    id: '5',
    prompt: 'Biotech company Phase 3 trial fails to meet primary endpoint. Secondary endpoints show promise.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'down',
    explanation: 'Missing primary endpoints is typically catastrophic for biotech stocks, regardless of secondary data. Market focuses on the failure.',
    xpReward: 10,
  },
  {
    id: '6',
    prompt: 'E-commerce company reports holiday sales up 5%, matching analyst estimates exactly.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'flat',
    explanation: 'Meeting estimates without surprise typically leads to minimal price movement as the news was already priced in.',
    xpReward: 10,
  },
  {
    id: '7',
    prompt: 'Cryptocurrency exchange announces new institutional custody service with major bank partnerships.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'up',
    explanation: 'Institutional adoption signals mainstream acceptance and expands addressable market, viewed positively by investors.',
    xpReward: 10,
  },
  {
    id: '8',
    prompt: 'Retail chain warns of margin compression due to promotional activity and higher labor costs.',
    options: ['up', 'down', 'flat'],
    correctAnswer: 'down',
    explanation: 'Margin warnings indicate profit pressure and potential earnings misses, leading to negative price action.',
    xpReward: 10,
  },
];

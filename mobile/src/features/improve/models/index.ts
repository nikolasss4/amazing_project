export type Answer = 'up' | 'down';

export interface Scenario {
  id: string;
  tradingPair: string;
  timeframe: string;
  chartSymbol: string;
  economicContext: string;
  options: Answer[];
  correctAnswer: Answer;
  explanation: string;
  xpReward: number;
}

// Mock scenarios for trading prediction training
export const mockScenarios: Scenario[] = [
  {
    id: '1',
    tradingPair: 'AAPL/USD',
    timeframe: '1D',
    chartSymbol: 'AAPL',
    economicContext: 'Earnings beat with revenue up 25% YoY. Forward guidance lowered due to supply chain concerns.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Lowered guidance weighs more than earnings beat. Investors price in future expectations.',
    xpReward: 10,
  },
  {
    id: '2',
    tradingPair: 'BTC/USD',
    timeframe: '1H',
    chartSymbol: 'BTCUSD',
    economicContext: 'Fed cuts rates by 50 basis points. Signals concerns about economic slowdown.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Rate cuts increase liquidity, positive for risk assets. Lower rates weaken dollar, boosting BTC appeal.',
    xpReward: 10,
  },
  {
    id: '3',
    tradingPair: 'GOOGL/USD',
    timeframe: '1D',
    chartSymbol: 'GOOGL',
    economicContext: '$10B stock buyback program announced. Quarterly results meet expectations.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Buybacks reduce share count and boost EPS. Signals management confidence and strong cash position.',
    xpReward: 10,
  },
  {
    id: '4',
    tradingPair: 'XOM/USD',
    timeframe: '1D',
    chartSymbol: 'XOM',
    economicContext: 'Oil prices surge 15% on OPEC cuts. Energy sector sentiment turns bullish.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Rising oil prices improve margins for energy stocks. Supply cuts drive prices higher.',
    xpReward: 10,
  },
  {
    id: '5',
    tradingPair: 'MRNA/USD',
    timeframe: '1D',
    chartSymbol: 'MRNA',
    economicContext: 'Phase 3 trial misses primary endpoint. Secondary endpoints show promise.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Missing primary endpoint is critical for biotech. Market focuses on failure over secondary data.',
    xpReward: 10,
  },
  {
    id: '6',
    tradingPair: 'TSLA/USD',
    timeframe: '1D',
    chartSymbol: 'TSLA',
    economicContext: 'Major price cuts across all models announced. Aims to boost demand amid competition.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Price cuts signal weak demand and margin pressure. Investors worry about profitability.',
    xpReward: 10,
  },
  {
    id: '7',
    tradingPair: 'ETH/USD',
    timeframe: '1H',
    chartSymbol: 'ETHUSD',
    economicContext: 'Exchange launches institutional custody service. Major bank partnerships announced.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Institutional adoption signals mainstream acceptance. Bank partnerships unlock new capital inflows.',
    xpReward: 10,
  },
  {
    id: '8',
    tradingPair: 'WMT/USD',
    timeframe: '1D',
    chartSymbol: 'WMT',
    economicContext: 'Retail chain warns of margin compression. Higher labor costs and promotions cited.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Margin warnings signal profit pressure. Higher costs squeeze profitability.',
    xpReward: 10,
  },
  {
    id: '9',
    tradingPair: 'NVDA/USD',
    timeframe: '1D',
    chartSymbol: 'NVDA',
    economicContext: 'AI chip demand surges. Tech companies expand AI infrastructure investments.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'AI spending directly benefits NVIDIA as dominant supplier. Limited competition supports growth.',
    xpReward: 10,
  },
  {
    id: '10',
    tradingPair: 'JPM/USD',
    timeframe: '1D',
    chartSymbol: 'JPM',
    economicContext: 'Bank increases loan loss provisions. Commercial real estate exposure cited.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Higher provisions signal expected defaults. Reduces profitability and raises quality concerns.',
    xpReward: 10,
  },
  {
    id: '11',
    tradingPair: 'META/USD',
    timeframe: '1D',
    chartSymbol: 'META',
    economicContext: '"Year of efficiency" announced. 20% workforce reduction planned.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Cost-cutting boosts profitability. Demonstrates fiscal discipline to investors.',
    xpReward: 10,
  },
  {
    id: '12',
    tradingPair: 'DIS/USD',
    timeframe: '1D',
    chartSymbol: 'DIS',
    economicContext: 'Streaming service loses subscribers for second quarter. Competition intensifying.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Consecutive losses challenge growth narrative. Competition compresses valuation multiple.',
    xpReward: 10,
  },
];

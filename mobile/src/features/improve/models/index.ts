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
    economicContext: 'Company reports earnings beat with revenue up 25% YoY, but lowers forward guidance due to supply chain concerns.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'While the earnings beat is positive, lowered guidance typically weighs more heavily on stock price. Investors price in future expectations, and reduced guidance signals upcoming challenges.',
    xpReward: 10,
  },
  {
    id: '2',
    tradingPair: 'BTC/USD',
    timeframe: '1H',
    chartSymbol: 'BTCUSD',
    economicContext: 'Fed announces interest rate cut of 50 basis points, signaling concerns about economic slowdown.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Rate cuts make borrowing cheaper and increase liquidity, generally positive for risk assets like Bitcoin. Lower rates also weaken the dollar, making BTC more attractive as an alternative asset.',
    xpReward: 10,
  },
  {
    id: '3',
    tradingPair: 'GOOGL/USD',
    timeframe: '1D',
    chartSymbol: 'GOOGL',
    economicContext: 'Tech company announces $10B stock buyback program while reporting inline quarterly results.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Large buyback programs reduce share count and signal management confidence. This typically supports stock price by increasing earnings per share and demonstrating strong cash position.',
    xpReward: 10,
  },
  {
    id: '4',
    tradingPair: 'XOM/USD',
    timeframe: '1D',
    chartSymbol: 'XOM',
    economicContext: 'Oil prices surge 15% after major OPEC production cut announcement. Energy sector sentiment shifts bullish.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'For energy stocks like Exxon, rising oil prices directly improve profit margins and revenue. OPEC cuts reduce supply, driving prices higher and benefiting oil producers.',
    xpReward: 10,
  },
  {
    id: '5',
    tradingPair: 'MRNA/USD',
    timeframe: '1D',
    chartSymbol: 'MRNA',
    economicContext: 'Biotech company Phase 3 trial fails to meet primary endpoint. Secondary endpoints show some promise.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Missing primary endpoints is typically catastrophic for biotech stocks. The market focuses on the failure rather than secondary data, as it suggests the drug may not receive FDA approval.',
    xpReward: 10,
  },
  {
    id: '6',
    tradingPair: 'TSLA/USD',
    timeframe: '1D',
    chartSymbol: 'TSLA',
    economicContext: 'Electric vehicle company announces major price cuts across all models to boost demand amid increasing competition.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Price cuts signal weakening demand and margin compression. While volume may increase, investors worry about profitability and competitive pressure, typically leading to negative price action.',
    xpReward: 10,
  },
  {
    id: '7',
    tradingPair: 'ETH/USD',
    timeframe: '1H',
    chartSymbol: 'ETHUSD',
    economicContext: 'Major cryptocurrency exchange announces new institutional custody service with major bank partnerships.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Institutional adoption signals mainstream acceptance and expands the addressable market. Bank partnerships bring credibility and may unlock significant new capital inflows.',
    xpReward: 10,
  },
  {
    id: '8',
    tradingPair: 'WMT/USD',
    timeframe: '1D',
    chartSymbol: 'WMT',
    economicContext: 'Retail chain warns of margin compression due to promotional activity and higher labor costs.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Margin warnings indicate profit pressure and potential earnings misses. Higher costs squeeze profitability, leading investors to reduce positions and causing negative price movement.',
    xpReward: 10,
  },
  {
    id: '9',
    tradingPair: 'NVDA/USD',
    timeframe: '1D',
    chartSymbol: 'NVDA',
    economicContext: 'AI chip demand continues to surge as major tech companies announce expanded AI infrastructure investments.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Increased AI infrastructure spending directly benefits NVIDIA as the dominant AI chip supplier. Rising demand with limited competition supports premium pricing and revenue growth.',
    xpReward: 10,
  },
  {
    id: '10',
    tradingPair: 'JPM/USD',
    timeframe: '1D',
    chartSymbol: 'JPM',
    economicContext: 'Major bank reports significant increase in loan loss provisions citing concerns about commercial real estate exposure.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Increased loan loss provisions signal management expects defaults to rise. This reduces near-term profitability and raises concerns about asset quality across the banking sector.',
    xpReward: 10,
  },
  {
    id: '11',
    tradingPair: 'META/USD',
    timeframe: '1D',
    chartSymbol: 'META',
    economicContext: 'Social media company announces "year of efficiency" with 20% workforce reduction and reduced capital expenditures.',
    options: ['up', 'down'],
    correctAnswer: 'up',
    explanation: 'Cost-cutting measures and improved operational efficiency are generally viewed positively by investors. Reduced expenses directly boost profitability and demonstrate fiscal discipline.',
    xpReward: 10,
  },
  {
    id: '12',
    tradingPair: 'DIS/USD',
    timeframe: '1D',
    chartSymbol: 'DIS',
    economicContext: 'Entertainment company streaming service reports subscriber losses for second consecutive quarter as competition intensifies.',
    options: ['up', 'down'],
    correctAnswer: 'down',
    explanation: 'Consecutive subscriber losses indicate the streaming business is struggling against competition. This challenges the growth narrative investors had priced in, leading to multiple compression.',
    xpReward: 10,
  },
];

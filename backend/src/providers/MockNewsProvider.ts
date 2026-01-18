/**
 * Mock News Provider
 * 
 * Returns fake news articles for testing and development.
 * No external API calls - all data is generated locally.
 */

import { NewsSourceProvider, NewsArticle } from '../interfaces/NewsSourceProvider';

export class MockNewsProvider implements NewsSourceProvider {
  private sourceName = 'mock';

  getSourceName(): string {
    return this.sourceName;
  }

  async fetchArticles(limit: number = 10): Promise<NewsArticle[]> {
    // Generate mock articles with rich entity content
    const articles: NewsArticle[] = [];
    const now = new Date();

    const mockArticleTemplates = [
      {
        title: '$NVDA Surges as Jensen Huang Announces AI Breakthrough',
        content: 'NVIDIA Corporation shares jumped 12% today after CEO Jensen Huang unveiled new artificial intelligence chips. The semiconductor giant is benefiting from unprecedented demand for machine learning infrastructure. Analysts at Goldman Sachs upgraded their price target, citing strong datacenter revenue growth.',
      },
      {
        title: 'Federal Reserve Chair Jerome Powell Signals Rate Pause',
        content: 'Federal Reserve Chairman Jerome Powell indicated that the central bank may pause interest rate increases. Speaking at the Economic Policy Symposium, Powell noted that inflation pressures are moderating. Treasury yields fell following his remarks, with $TLT rising sharply.',
      },
      {
        title: 'Elon Musk and Tesla Inc Face SEC Investigation',
        content: 'The Securities and Exchange Commission has opened an investigation into Tesla Inc and CEO Elon Musk regarding recent tweets about production targets. $TSLA shares fell 5% on the news. Legal experts suggest this could result in additional oversight requirements.',
      },
      {
        title: '$AAPL Reports Record iPhone Sales in China',
        content: 'Apple Inc exceeded analyst expectations with strong iPhone sales in the Chinese market. CEO Tim Cook attributed the success to innovative features and strategic partnerships. The tech giant also announced a new $100 billion share buyback program, sending $AAPL to new highs.',
      },
      {
        title: 'Bitcoin Rallies as BlackRock Files ETF Application',
        content: 'Cryptocurrency markets surged after BlackRock Inc, led by Larry Fink, submitted a Bitcoin exchange-traded fund application. $BTC jumped 15% while $ETH gained 10%. The move signals growing institutional acceptance of digital assets.',
      },
      {
        title: 'JPMorgan Chase Reports Strong Banking Results',
        content: 'JPMorgan Chase posted quarterly earnings that beat expectations, with CEO Jamie Dimon highlighting robust consumer spending and credit quality. Investment banking revenue grew despite market volatility. Financial sector stocks rallied on the news.',
      },
      {
        title: 'Warren Buffett Increases Berkshire Hathaway Stake in Energy',
        content: 'Legendary investor Warren Buffett disclosed that Berkshire Hathaway has significantly increased its position in energy stocks. The conglomerate added shares of Chevron Corp and Occidental Petroleum. Buffett noted that fossil fuels remain essential for economic growth.',
      },
      {
        title: 'Amazon Web Services Launches AI Tools for Developers',
        content: 'Amazon Web Services announced new artificial intelligence and machine learning tools at its annual conference. CEO Andy Jassy emphasized the company\'s commitment to democratizing AI technology. The cloud computing giant is competing directly with Microsoft Corp and Google Cloud.',
      },
      {
        title: '$MSFT Stock Hits Record High on Azure Growth',
        content: 'Microsoft Corporation shares reached an all-time high as Azure cloud revenue grew 50% year-over-year. CEO Satya Nadella credited investments in artificial intelligence and partnerships with OpenAI. The software giant is now valued at over $3 trillion.',
      },
      {
        title: 'European Central Bank President Christine Lagarde Discusses Inflation',
        content: 'European Central Bank President Christine Lagarde warned that inflation remains a concern despite recent economic data. The ECB may continue tightening monetary policy to bring prices under control. Euro-denominated assets showed mixed reactions to her comments.',
      },
    ];

    for (let i = 0; i < Math.min(limit, mockArticleTemplates.length); i++) {
      const hoursAgo = Math.floor(Math.random() * 24);
      const publishedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

      const template = mockArticleTemplates[i];

      articles.push({
        source: this.sourceName,
        title: template.title,
        content: template.content,
        url: `https://mock-news.example.com/article/${i + 1}/${Date.now()}`,
        publishedAt,
      });
    }

    return articles;
  }


  async isAvailable(): Promise<boolean> {
    // Mock provider is always available
    return true;
  }
}


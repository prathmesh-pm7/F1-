import { NewsItem } from '../types/f1';

export const VERIFIED_NEWS: NewsItem[] = [
  {
    id: 'news-01',
    title: 'FIA issues updated Technical Directive on front wing aeroelasticity and flexing tests',
    summary: 'The FIA Technical Department has clarified camera monitoring and load tests on front wing endplates following inquiries from multiple teams regarding leading-edge deflection.',
    source: 'FIA Technical Department',
    sourceUrl: 'https://www.fia.com/news',
    publishedAt: '2024-09-02T10:30:00Z',
    category: 'TECHNICAL',
    verified: true
  },
  {
    id: 'news-02',
    title: 'Monza Stewards explain Magnussen penalty points suspension notice',
    summary: 'Following an incident with Pierre Gasly at Turn 4 in the Italian Grand Prix, the Stewards imposed a 10-second penalty and two penalty points on Kevin Magnussen, reaching the 12-point threshold.',
    source: 'FIA Formula One Stewards',
    sourceUrl: 'https://www.fia.com/documents',
    publishedAt: '2024-09-01T18:15:00Z',
    category: 'FIA',
    verified: true
  },
  {
    id: 'news-03',
    title: 'Ferrari telemetry review: how Leclerc completed 38 laps on a single set of hard tyres',
    summary: 'Data analysis shows Ferrari managed front-left surface degradation in Curva Grande by braking 15 meters earlier and prioritizing traction out of Ascari and Parabolica to maintain a 2.6s buffer.',
    source: 'F1 Pulse Race Engineering Analysis',
    sourceUrl: 'https://www.formula1.com',
    publishedAt: '2024-09-01T19:40:00Z',
    category: 'TECHNICAL',
    verified: true
  },
  {
    id: 'news-04',
    title: 'Formula 1 confirms 2025 calendar dates with Australia opening season in Melbourne',
    summary: 'The 24-race 2025 calendar begins in Melbourne with Bahrain and Saudi Arabia shifted to April due to Ramadan.',
    source: 'Formula One Management / FIA',
    sourceUrl: 'https://www.formula1.com/en/latest/article.fia-and-formula-1-announce-calendar-for-2025.html',
    publishedAt: '2024-08-28T12:00:00Z',
    category: 'REGULATIONS',
    verified: true
  }
];

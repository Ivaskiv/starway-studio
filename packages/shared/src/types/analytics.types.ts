// shared/src/types/analytics.types.ts

export interface AnalyticsOverview {
  userId: string;
  period: AnalyticsPeriod;
  funnels: FunnelAnalyticsSummary[];
  totalRevenue: number;
  totalConversions: number;
  totalViews: number;
  conversionRate: number;
  revenueGrowth: number;
  charts: AnalyticsChart[];
}

export enum AnalyticsPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

export interface FunnelAnalyticsSummary {
  funnelId: string;
  funnelName: string;
  views: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsChart {
  type: 'line' | 'bar' | 'pie' | 'funnel';
  title: string;
  data: ChartDataPoint[];
  labels?: string[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface UserBehavior {
  userId: string;
  sessionDuration: number;
  pagesVisited: number;
  clickPattern: ClickEvent[];
  deviceInfo: DeviceInfo;
  location?: GeoLocation;
}

export interface ClickEvent {
  elementId: string;
  timestamp: string;
  page: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
}

export interface GeoLocation {
  country: string;
  city: string;
  region: string;
}
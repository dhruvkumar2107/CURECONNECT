import { AnalyticsContext, Funnel, Patterns, Segment } from '../../services/kpiEngine';
import { Insight } from '../../services/insightEngine';

export interface DashboardProps {
  ctx: AnalyticsContext;
  patterns: Patterns;
  funnels: Funnel[];
  segments: Segment[];
  insights: Insight[];
}
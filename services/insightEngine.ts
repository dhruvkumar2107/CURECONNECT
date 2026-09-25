import { AnalyticsContext, Funnel, Patterns, Segment } from './kpiEngine';

export type InsightType = 'opportunity' | 'warning' | 'positive' | 'info';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  observation: string;
  supportingIndex: string;
  evidence: string[];
  interpretation: string;
  productAction: string;
  metricAffected: string;
  confidence: number;
}

interface RuleInput {
  ctx: AnalyticsContext;
  patterns: Patterns;
  funnels: Funnel[];
  segments: Segment[];
}

const dampen = (n: number, cap = 20): number => Math.min(0.95, Math.max(0.5, 0.5 + n / cap));

const stageDropoffs = (funnel: Funnel): { from: string; to: string; pct: number; users: number } => {
  if (funnel.stages.length < 2) return { from: '', to: '', pct: 0, users: 0 };
  let best = funnel.stages[1];
  let bestPct = 0;
  for (let i = 1; i < funnel.stages.length; i++) {
    const s = funnel.stages[i];
    if (s.dropoffPct !== null && s.dropoffPct > bestPct) { bestPct = s.dropoffPct; best = s; }
  }
  const idx = funnel.stages.indexOf(best);
  return {
    from: funnel.stages[Math.max(0, idx - 1)].label,
    to: best.label,
    pct: bestPct,
    users: best.events,
  };
};

const kpiChange = (kpis: AnalyticsContext['kpis'], id: string): string => {
  const k = kpis.find((x) => x.id === id);
  if (!k || k.previousValue === null || k.value === 0) return 'no prior-period sample';
  const v = k.changePct;
  return `${v !== null && v >= 0 ? '+' : ''}${(v ?? 0).toFixed(1)}% vs previous period`;
};

const fmtCount = (v: number) => Math.round(v).toLocaleString();

export const buildInsights = ({ ctx, patterns, funnels, segments }: RuleInput): Insight[] => {
  const out: Insight[] = [];
  const agg = ctx.agg;
  if (agg.events === 0) return out;

  const kpi = (id: string) => ctx.kpis.find((k) => k.id === id);
  const hasData = (id: string) => { const k = kpi(id); return !!k && k.hasData; };

  const push = (i: Omit<Insight, 'id' | 'confidence'> & { sample?: number }) => {
    out.push({ ...i, id: `in_${out.length + 1}`, confidence: dampen(i.sample ?? agg.events) });
  };

  // 1. Medicine funnel biggest drop-off
  const medFunnel = funnels.find((f) => f.id === 'medicine_funnel');
  if (medFunnel && medFunnel.stages.length > 1) {
    const d = stageDropoffs(medFunnel);
    if (d.pct >= 40) {
      push({
        type: 'opportunity', sample: medFunnel.stages[0].users,
        title: `Point of biggest loss: "${d.from}" → "${d.to}"`,
        observation: `The largest drop-off in the medicine journey is between "${d.from}" and "${d.to}" (${d.pct.toFixed(0)}% of users leave at this step). Order conversion is ${kpiChange(ctx.kpis, 'order_conversion')}.`,
        supportingIndex: `Medicine funnel · stage drop-off ${d.from} → ${d.to}`,
        evidence: [`User drop-off at this stage: ${d.pct.toFixed(0)}%`, `Order conversion ${kpiChange(ctx.kpis, 'order_conversion')}`],
        interpretation: 'Users who reach this step stop progressing, which points to friction at exactly one checkpoint (e.g., availability or checkout).',
        productAction: `Reduce friction between ${d.from} and ${d.to} — simplify the step, pre-fill data, or surface stock messages earlier.`,
        metricAffected: 'Medicine Order Conversion Rate',
      });
    }
  }

  // 2. Appointment funnel biggest drop-off
  const apptFunnel = funnels.find((f) => f.id === 'appointment_funnel');
  if (apptFunnel && apptFunnel.stages.length > 1) {
    const d = stageDropoffs(apptFunnel);
    if (d.pct >= 45) {
      push({
        type: 'opportunity', sample: apptFunnel.stages[0].users,
        title: `Appointment booking leaks at "${d.to}"`,
        observation: `The biggest drop-off in the appointment journey is between "${d.from}" and "${d.to}" (${d.pct.toFixed(0)}% leave here). Appointment conversion is ${kpiChange(ctx.kpis, 'appt_conversion')}.`,
        supportingIndex: `Appointment funnel · stage drop-off ${d.from} → ${d.to}`,
        evidence: [`User drop-off at this stage: ${d.pct.toFixed(0)}%`, `${d.users} events reached the "${d.to}" stage`],
        interpretation: 'A single step loses the most users, so improving this checkpoint has the highest leverage on consultation bookings.',
        productAction: `Streamline the ${d.to} step — reduce form fields, show calendar availability up-front, add progress indicators.`,
        metricAffected: 'Appointment Conversion Rate',
      });
    }
  }

  // 3. Medicine availability
  if (hasData('availability_rate')) {
    const ar = kpi('availability_rate')!;
    if (ar.value < 70) {
      push({
        type: 'warning', sample: agg.availabilityChecks,
        title: 'Low medicine availability is blocking demand',
        observation: `${ar.display} of availability checks returned an in-stock result (${fmtCount(agg.medUnavailable)} checks found no stock).`,
        supportingIndex: 'KPI · Medicine Availability Rate',
        evidence: [`Availability rate ${ar.display}`, `${fmtCount(agg.medAvailable)} available vs ${fmtCount(agg.medUnavailable)} unavailable`],
        interpretation: 'Users are actively looking for medicines the catalogue cannot currently satisfy — unfulfilled demand.',
        productAction: 'Coordinate with pharmacy partners on stock visibility, add "notify me when available" and alternate-medicine suggestions.',
        metricAffected: 'Medicine Availability Rate',
      });
    } else {
      push({
        type: 'positive', sample: agg.availabilityChecks,
        title: 'Medicine availability is healthy',
        observation: `${ar.display} of availability checks returned stock — the core promise is being met.`,
        supportingIndex: 'KPI · Medicine Availability Rate',
        evidence: [`${fmtCount(agg.medAvailable)} in-stock results`],
        interpretation: 'Supply coverage is good; focus can shift to conversion depth.',
        productAction: 'Promote availability coverage in marketing to build trust in the network.',
        metricAffected: 'Medicine Availability Rate',
      });
    }
  }

  // 4. Search-to-result
  if (hasData('search_to_result')) {
    const sr = kpi('search_to_result')!;
    if (sr.value < 60) {
      push({
        type: 'warning', sample: agg.totalSearches,
        title: 'Searches often return no results',
        observation: `${sr.display} of all searches returned at least one result — ${fmtCount(agg.totalSearches - agg.searchesWithResults)} searches led nowhere.`,
        supportingIndex: 'KPI · Search-to-Result Rate',
        evidence: [`${fmtCount(agg.searchesWithResults)} searches with results`, `${fmtCount(agg.totalSearches)} total searches`],
        interpretation: 'A large share of user intent is not matched by catalogue items, especially medicine names.',
        productAction: 'Add fuzzy matching, aliases for common medicine names, and zero-result fallbacks.',
        metricAffected: 'Search-to-Result Rate',
      });
    }
  }

  // 5. Cancellations
  if (hasData('appt_cancellation')) {
    const ac = kpi('appt_cancellation')!;
    if (ac.value > 15 && agg.apptConfirmed > 0) {
      push({
        type: 'warning', sample: agg.apptConfirmed,
        title: 'Appointment cancellations are up',
        observation: `${ac.display} of confirmed appointments were later cancelled (${agg.apptCancelled} cancellations).`,
        supportingIndex: 'KPI · Appointment Cancellation Rate',
        evidence: [`Cancelled: ${agg.apptCancelled}`, `Confirmed: ${agg.apptConfirmed}`],
        interpretation: 'Confirmed bookings are falling apart — timing, trust, or expectation issues at scheduling.',
        productAction: 'Send confirmation + reminder notifications, add reschedule flexibility before cancel, gather cancellation reasons.',
        metricAffected: 'Appointment Cancellation Rate',
      });
    }
  }
  if (hasData('order_cancellation')) {
    const oc = kpi('order_cancellation')!;
    if (oc.value > 15 && agg.orderStarted > 0) {
      push({
        type: 'warning', sample: agg.orderStarted,
        title: 'Medicine orders are often cancelled after starting',
        observation: `${oc.display} of started orders were cancelled (${agg.orderCancelled}).`,
        supportingIndex: 'KPI · Order Cancellation Rate',
        evidence: [`Orders cancelled: ${agg.orderCancelled}`, `Orders started: ${agg.orderStarted}`],
        interpretation: 'Users start a reservation but abort — likely price/location/ETA mismatch discovered mid-checkout.',
        productAction: 'Surface pharmacy name, distance, and delivery ETA before checkout starts.',
        metricAffected: 'Medicine Order Conversion Rate',
      });
    }
  }

  // 6. Peak-hours behavioural pattern
  const busy = patterns.peakHours.slice().sort((a, b) => b.count - a.count).slice(0, 3);
  if (busy.length && busy[0].count > 0) {
    push({
      type: 'info', sample: busy[0].count,
      title: 'Usage clusters into predictable peak windows',
      observation: `Top peak hours are ${busy.map((h) => `${h.hour}:00`).join(', ')} (${busy[0].count} events at the busiest hour).`,
      supportingIndex: 'Behaviour · Peak hours',
      evidence: [`Peak hour ${busy[0].hour}:00 with ${busy[0].count} events`],
      interpretation: 'Demand concentrates around specific times — align staffing and features around these windows.',
      productAction: 'Schedule pharmacy/doctor availability push and notification windows at peak hours; queue non-urgent maintenance off-peak.',
      metricAffected: 'Average Session Duration',
    });
  }

  // 7. Returning vs new conversion gap
  const rv = patterns.returningVsNew.find((r) => r.group === 'Returning Users');
  const nv = patterns.returningVsNew.find((r) => r.group === 'New Users');
  if (rv && nv && rv.sessions >= 5 && nv.sessions >= 5 && rv.conversionRate > nv.conversionRate + 10) {
    push({
      type: 'positive', sample: rv.sessions + nv.sessions,
      title: 'Returning users convert clearly better than new users',
      observation: `Returning users convert at ${rv.conversionRate.toFixed(1)}% vs ${nv.conversionRate.toFixed(1)}% for new users.`,
      supportingIndex: 'Behaviour · Returning vs New Users',
      evidence: [`Returning conversion ${rv.conversionRate.toFixed(1)}%`, `New conversion ${nv.conversionRate.toFixed(1)}%`],
      interpretation: 'Once users learn the product they convert — new-user onboarding is the current bottleneck.',
      productAction: 'Add a guided first-run tour and quicker time-to-first-search.',
      metricAffected: 'Overall Conversion Rate',
    });
  }

  // 8. Mobile friction
  const mb = patterns.mobileVsDesktop.find((m) => m.device === 'mobile');
  const dt = patterns.mobileVsDesktop.find((m) => m.device === 'desktop');
  if (mb && dt && mb.sessions >= 5 && dt.sessions >= 5 && dt.conversionRate > mb.conversionRate + 10) {
    push({
      type: 'opportunity', sample: mb.sessions + dt.sessions,
      title: 'Mobile sessions convert worse than desktop',
      observation: `Mobile conversion is ${mb.conversionRate.toFixed(1)}% vs ${dt.conversionRate.toFixed(1)}% on desktop.`,
      supportingIndex: 'Behaviour · Mobile vs Desktop',
      evidence: [`${mb.sessions} mobile sessions`, `${dt.sessions} desktop sessions`],
      interpretation: 'Given most healthcare browsing is on phones, the gap suggests mobile UX friction in booking/checkout.',
      productAction: 'Audit the appointment and order checkout on small viewports; test 1-tap confirm flows.',
      metricAffected: 'Overall Conversion Rate',
    });
  }

  // 9. Search-heavy segment lag
  const heavy = segments.find((s) => s.segmentId === 'search_heavy');
  if (heavy && heavy.totalActive >= 5) {
    const avgConv = heavy.conversionRate;
    const other = segments.filter((s) => s.segmentId !== 'search_heavy' && s.totalActive >= 5);
    const otherAvg = other.length ? other.reduce((a, b) => a + b.conversionRate, 0) / other.length : 0;
    if (avgConv < otherAvg - 10) {
      push({
        type: 'opportunity', sample: heavy.totalActive,
        title: 'Search-heavy users do not convert',
        observation: `Search-heavy users (${heavy.totalActive} users) convert at ${avgConv.toFixed(1)}% vs ~${otherAvg.toFixed(1)}% for other segments.`,
        supportingIndex: 'Segments · Search-heavy Users',
        evidence: [`Segment conversion ${avgConv.toFixed(1)}%`, `Segment size ${heavy.totalActive} users`],
        interpretation: 'Power-searchers browse a lot but rarely book — likely supply coverage rather than intent.',
        productAction: 'Measure which of their searches return zero results and prioritise adding those medicines.',
        metricAffected: 'Search-to-Action Conversion Rate',
      });
    }
  }

  // 10. Booking abandoners
  const ab = segments.find((s) => s.segmentId === 'booking_abandoners');
  if (ab && ab.totalActive >= 3) {
    push({
      type: 'warning', sample: ab.totalActive,
      title: `${ab.totalActive} users started a booking but never confirmed`,
      observation: `The "Booking Abandoners" segment has ${ab.totalActive} users (${ab.pctOfActive.toFixed(0)}% of active users) who started but never confirmed an appointment.`,
      supportingIndex: 'Segments · Booking Abandoners',
      evidence: [`Segment size ${ab.totalActive}`, `Segment conversion rate ${ab.conversionRate.toFixed(1)}%`],
      interpretation: 'A dedicated cohort stalls at the booking step — the appointment funnel leak is structural, not noise.',
      productAction: 'Introduce an express one-field booking and defer non-essential details.',
      metricAffected: 'Appointment Conversion Rate',
    });
  }

  // 11. Medicine search abandonment
  if (patterns.medAbandonment.searches > 0) {
    push({
      type: 'info', sample: patterns.medAbandonment.searches,
      title: 'Medicine searchers rarely start an order',
      observation: `Medicine-search abandonment is ${patterns.medAbandonment.rate.toFixed(1)}% — ${patterns.medAbandonment.ordersStarted} orders started from ${patterns.medAbandonment.searches} medicine searches.`,
      supportingIndex: 'Behaviour · Medicine abandonment',
      evidence: [`${patterns.medAbandonment.searches} searches`, `${patterns.medAbandonment.ordersStarted} order starts`],
      interpretation: 'Search volume is abundant but transferring to a reservation is rare.',
      productAction: 'Let users "reserve" directly from search results with one tap rather than requiring a full checkout walk.',
      metricAffected: 'Medicine Order Conversion Rate',
    });
  }

  // 12. Stickiness (DAU/WAU)
  if (hasData('dau') && hasData('wau')) {
    const dau = kpi('dau')!;
    const wau = kpi('wau')!;
    const stickiness = wau.value > 0 ? (dau.value / wau.value) * 100 : 0;
    if (Number.isFinite(stickiness) && wau.value > 0) {
      push({
        type: stickiness < 20 ? 'opportunity' : 'info', sample: wau.value,
        title: `Weekly stickiness is ${stickiness.toFixed(1)}%`,
        observation: `DAU is ${Math.round(dau.value)} out of WAU ${Math.round(wau.value)} → ${stickiness.toFixed(1)}% daily/weekly engagement ratio.`,
        supportingIndex: 'KPIs · DAU ÷ WAU (stickiness)',
        evidence: [`DAU ${Math.round(dau.value)}`, `WAU ${Math.round(wau.value)}`],
        interpretation: stickiness < 20
          ? 'Most weekly users visit only once or twice — re-engagement habit is not formed.'
          : 'A moderate share of weekly users return daily, indicating a formed usage habit.',
        productAction: stickiness < 20
          ? 'Add medicine reminders and refill notifications to give users a daily reason to return.'
          : 'Protect the returning-habit loop; measure stickiness weekly.',
        metricAffected: 'DAU · WAU · Retention',
      });
    }
  }

  // 13. Retention signal
  if (hasData('user_retention')) {
    const rk = kpi('user_retention')!;
    if (rk.value >= 25) {
      push({
        type: 'positive', sample: agg.sessions,
        title: 'Retention shows a returning audience',
        observation: `${rk.display} of previous-period active users returned in the current period.`,
        supportingIndex: 'KPI · User Retention',
        evidence: [`Retention ${rk.display}`],
        interpretation: 'A meaningful share of users come back — a strong early product-market-fit signal.',
        productAction: 'Double down on the journeys returning users actually take (check funnel paths).',
        metricAffected: 'User Retention',
      });
    }
  }

  // 14. Feature adoption
  if (hasData('feature_adoption')) {
    const fa = kpi('feature_adoption')!;
    if (fa.value < 15 && agg.activeUsers > 0) {
      push({
        type: 'opportunity', sample: agg.activeUsers,
        title: 'Feature adoption is low',
        observation: `Only ${fa.display} of active users engaged with a feature beyond search (${ctx.featureUsers} of ${agg.activeUsers} users).`,
        supportingIndex: 'KPI · Feature Adoption Rate',
        evidence: [`${ctx.featureUsers} feature users`, `${agg.activeUsers} active users`],
        interpretation: 'Most users stay in the search layer and never reach appointments, orders, or other features.',
        productAction: 'Surface the teleconsultation entry point on search pages and after every search result.',
        metricAffected: 'Feature Adoption Rate',
      });
    }
  }

  // 15. Top searched medicines vs availability
  const wanted = patterns.topMedicines.slice(0, 5);
  if (wanted.length && agg.medAvailable === 0) {
    push({
      type: 'info', sample: wanted[0].count,
      title: 'Most-searched medicines are all unavailable',
      observation: `The top searched medicines (${wanted.map((m) => m.label).join(', ')}) currently have no availability hits at all.`,
      supportingIndex: 'Behaviour · Top medicines × availability',
      evidence: [`Top search "${wanted[0].label}" had ${wanted[0].count} searches`],
      interpretation: 'The catalogue is missing the exact items users want most.',
      productAction: 'Prioritise onboarding pharmacies that stock these exact medicines.',
      metricAffected: 'Medicine Availability Rate · Search-to-Result',
    });
  } else if (wanted.length) {
    push({
      type: 'info', sample: wanted[0].count,
      title: `Top searches driven by "${wanted[0].label}"`,
      observation: `"${wanted[0].label}" is the most searched medicine (${wanted[0].count} searches in the period).`,
      supportingIndex: 'Behaviour · Top searched medicines',
      evidence: [`${wanted[0].count} searches`, `Top-5: ${wanted.map((m) => m.label).join(', ')}`],
      interpretation: 'A few specific medicines dominate demand — stock and promote them aggressively.',
      productAction: 'Guarantee stock for the top-N searched medicines and surface an "In stock" badge on search results.',
      metricAffected: 'Medicine Order Conversion Rate',
    });
  }

  // 16. High drop-off page
  if (patterns.highDropoffPages.length && patterns.highDropoffPages[0].count >= 3) {
    const p = patterns.highDropoffPages[0];
    push({
      type: 'info', sample: p.count,
      title: `"${p.page}" is the most common ending point for non-converting sessions`,
      observation: `${p.count} sessions without a completed goal ended on "${p.page}".`,
      supportingIndex: 'Behaviour · Exit pages',
      evidence: [`Exit count ${p.count}`, `Top exits: ${patterns.highDropoffPages.slice(0, 3).map((x) => `${x.page} (${x.count})`).join(', ')}`],
      interpretation: 'Sessions terminate here — either the page completes intent or blocks it.',
      productAction: 'Add a prominent next-action CTA and in-page help on this page.',
      metricAffected: 'Overall Conversion Rate',
    });
  }

  // 17. Quick wins: top converting page
  if (patterns.highConversionPages.length) {
    const c = patterns.highConversionPages[0];
    const cr = c.entrance ? (c.conversions / c.entrance) * 100 : 0;
    if (c.entrance >= 3 && cr > 0) {
      push({
        type: 'positive', sample: c.entrance,
        title: `"${c.page}" converts best of all pages`,
        observation: `${c.conversions} goal-completing sessions included "${c.page}" out of ${c.entrance} sessions that visited it (${cr.toFixed(0)}%).`,
        supportingIndex: 'Behaviour · High-conversion pages',
        evidence: [`Visited by ${c.entrance} sessions`, `${c.conversions} of them reached a goal`],
        interpretation: 'Users who land on this page reach goals most reliably — it should be a primary funnel entry.',
        productAction: 'Route more traffic to this page and apply its UX patterns elsewhere.',
        metricAffected: 'Overall Conversion Rate',
      });
    }
  }

  // 18. Top doctor demand
  if (patterns.topDoctors.length && patterns.topDoctors[0].count >= 3) {
    const d = patterns.topDoctors[0];
    push({
      type: 'info', sample: d.count,
      title: `${d.label} receives the most profile views`,
      observation: `${d.label} had ${d.count} profile views — the most of any doctor.`,
      supportingIndex: 'Behaviour · Top doctors',
      evidence: [`${d.count} profile views`, `Top specialties: ${patterns.topSpecialties.slice(0, 2).map((s) => `${s.label} (${s.count})`).join(', ') || 'n/a'}`],
      interpretation: 'Demand concentrates on specific doctors/specialties.',
      productAction: 'Ensure top doctors have visible availability and expand supply in their specialty.',
      metricAffected: 'Appointment Conversion Rate',
    });
  }

  return out.sort((a, b) => {
    const order: Record<InsightType, number> = { warning: 0, opportunity: 1, positive: 2, info: 3 };
    return order[a.type] - order[b.type] || b.confidence - a.confidence;
  });
};
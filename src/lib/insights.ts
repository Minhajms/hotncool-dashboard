export type Insight = { level: "good" | "warn" | "bad" | "info"; text: string };

export const INSIGHT_STYLE: Record<Insight["level"], { bg: string; fg: string; icon: string }> = {
  good: { bg: "var(--cool-soft)", fg: "var(--good)", icon: "✓" },
  info: { bg: "var(--surface-2)", fg: "var(--foreground)", icon: "•" },
  warn: { bg: "var(--hot-soft)", fg: "var(--hot)", icon: "⚠" },
  bad: { bg: "var(--hot-soft)", fg: "var(--bad)", icon: "✕" },
};

type ClarityInput = {
  sessions: number;
  ios: number;
  android: number;
  deadTaps: number;
  rageTaps: number;
  activeSecs: number;
  screensPerSession: number;
  topScreen?: string;
  days: number;
};

/** Decision-oriented observations from Clarity app-behaviour data. */
export function clarityInsights(d: ClarityInput): Insight[] {
  const out: Insight[] = [];
  if (d.sessions === 0) return out;

  const deadPerSession = d.deadTaps / d.sessions;
  if (deadPerSession >= 1) {
    out.push({
      level: "bad",
      text: `High dead taps — about ${deadPerSession.toFixed(1)} per session. Users tap things that don't respond${d.topScreen ? ` (start with the “${d.topScreen}” screen)` : ""}. Watch those Clarity recordings; likely a broken button or a non-tappable element that looks tappable.`,
    });
  } else if (deadPerSession >= 0.4) {
    out.push({ level: "warn", text: `Moderate dead taps (~${deadPerSession.toFixed(1)}/session). Worth a quick UX review of the busiest screens.` });
  } else {
    out.push({ level: "good", text: `Dead taps are low (~${deadPerSession.toFixed(1)}/session) — the app feels responsive.` });
  }

  if (d.rageTaps / d.sessions >= 0.05) {
    out.push({ level: "warn", text: `Rage taps detected — some users tap repeatedly in frustration. Pair this with the dead-tap screens to find the culprit.` });
  }

  const iosShare = d.sessions > 0 ? Math.round((d.ios / d.sessions) * 100) : 0;
  const androidShare = d.sessions > 0 ? Math.round((d.android / d.sessions) * 100) : 0;
  out.push({
    level: "info",
    text: `Usage split: iPhone ${iosShare}% · Android ${androidShare}%. ${iosShare >= androidShare ? "iOS is your primary app audience — prioritise iOS polish and iOS ad targeting." : "Android leads — prioritise Android."}`,
  });

  if (d.activeSecs > 0) {
    if (d.activeSecs < 60) out.push({ level: "warn", text: `Short sessions (~${d.activeSecs}s active). People aren't lingering — check if the ordering path is too slow or the home screen isn't compelling.` });
    else out.push({ level: "good", text: `Healthy engagement (~${d.activeSecs}s active per session, ${d.screensPerSession.toFixed(1)} screens deep).` });
  }

  return out;
}

type OverviewInput = {
  metaSpend: number;
  metaClicks: number;
  ga4Users: number;
  scClicks: number;
  topQuery?: string;
  installs: number;
  hasApp: boolean;
};

/** Top-line marketing observations for the Overview. */
export function overviewInsights(d: OverviewInput): Insight[] {
  const out: Insight[] = [];
  if (d.metaSpend > 0 && d.metaClicks > 0) {
    const cpc = d.metaSpend / d.metaClicks;
    out.push({
      level: cpc <= 0.3 ? "good" : "info",
      text: `Meta ads cost QAR ${cpc.toFixed(2)} per link click${cpc <= 0.3 ? " — cheap traffic, room to scale spend." : "."} ${!d.hasApp ? "Once install tracking is live we can show true cost-per-install and whether these clicks convert." : ""}`,
    });
  }
  if (d.scClicks > 0 && d.topQuery) {
    const branded = /hot ?n ?cool|hotncool|hot and cool|حار|بارد/i.test(d.topQuery);
    out.push({
      level: "info",
      text: branded
        ? `Most Google clicks come from your brand name (“${d.topQuery}”) — people who already know you. To grow, target non-brand searches like “food delivery Qatar”.`
        : `Top Google search is “${d.topQuery}” — non-brand demand you're capturing.`,
    });
  }
  if (d.ga4Users > 0 && d.metaSpend > 0) {
    out.push({ level: "info", text: `You're paying for ad clicks and getting ${d.ga4Users.toLocaleString()} website visitors — once GA4 conversion tracking is set up we can tie ad spend to actual orders.` });
  }
  return out;
}

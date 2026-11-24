import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Notice from "../components/Notice";
import { ProductArt } from "../components/Art";
import { ArrowRightIcon, CheckIcon, ClockIcon, InfoIcon, AlertIcon } from "../components/Icons";
import { getProgress } from "../api/client";
import { SEVERITIES, SKIN_TYPES, formatDate, labelFor, parseServerDate } from "../lib/skin";

const SEVERITY_ROWS = [
  { level: 3, label: "Severe" },
  { level: 2, label: "Moderate" },
  { level: 1, label: "Mild" },
];

const DIRECTION_TONE = { improving: "good", worsening: "watch", steady: "steady", none: "steady" };

const STATUS_TEXT = {
  on_track: (days) => `Next check-in in ${days} day${days === 1 ? "" : "s"}`,
  due_soon: () => "Next check-in is tomorrow",
  due: () => "This week's check-in is due",
  overdue: (days) => `Check-in overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
  none: () => "No check-ins yet",
};

const INSIGHT_ICON = { good: CheckIcon, watch: AlertIcon, info: InfoIcon };

/**
 * The weekly trend. Acne severity is the line; the band underneath shows the
 * skin type read in the same week, so both measures are read together.
 */
function TrendChart({ weeks }) {
  const width = 760;
  const height = 230;
  const padLeft = 92;
  const padRight = 28;
  const padTop = 24;
  const plotHeight = 130;
  const bandTop = padTop + plotHeight + 34;

  const span = Math.max(weeks.length - 1, 1);
  const stepX = (width - padLeft - padRight) / span;
  const x = (index) => (weeks.length === 1 ? padLeft + (width - padLeft - padRight) / 2 : padLeft + index * stepX);
  const y = (level) => padTop + plotHeight - ((level - 1) / 2) * plotHeight;

  const points = weeks.map((week, index) => [x(index), y(week.severity_level)]);
  const area = [
    `${points[0][0]},${padTop + plotHeight}`,
    ...points.map((p) => p.join(",")),
    `${points[points.length - 1][0]},${padTop + plotHeight}`,
  ].join(" ");

  const describe = `Acne severity across ${weeks.length} tracked week${weeks.length === 1 ? "" : "s"}, oldest first: ${weeks
    .map((w) => `${w.week_label}, ${w.acne_severity}, ${w.skin_type} skin`)
    .join("; ")}.`;

  return (
    <figure className="trend-figure">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={describe} preserveAspectRatio="xMidYMid meet">
        {SEVERITY_ROWS.map((row) => (
          <g key={row.level}>
            <line x1={padLeft} x2={width - padRight} y1={y(row.level)} y2={y(row.level)} className="trend-grid" />
            <text x={padLeft - 14} y={y(row.level) + 5} textAnchor="end" className="trend-axis">
              {row.label}
            </text>
          </g>
        ))}

        {weeks.length > 1 && <polygon points={area} className="trend-area" />}
        {weeks.length > 1 && <polyline points={points.map((p) => p.join(",")).join(" ")} className="trend-line" />}

        {weeks.map((week, index) => (
          <circle
            key={`dot-${week.week_start}`}
            cx={x(index)}
            cy={y(week.severity_level)}
            r="7"
            className={`trend-dot ${week.source === "manual" ? "is-manual" : ""}`}
          >
            <title>{`${week.week_label}: ${week.acne_severity}`}</title>
          </circle>
        ))}

        <text x={padLeft - 14} y={bandTop + 17} textAnchor="end" className="trend-axis">
          Skin type
        </text>
        {weeks.map((week, index) => {
          const cellWidth = weeks.length === 1 ? 120 : Math.min(stepX - 6, 96);
          return (
            <g key={`band-${week.week_start}`}>
              <rect
                x={x(index) - cellWidth / 2}
                y={bandTop}
                width={cellWidth}
                height="26"
                rx="13"
                className={`trend-band type-${week.skin_type}`}
              />
              <text x={x(index)} y={bandTop + 17} textAnchor="middle" className="trend-band-text">
                {labelFor(SKIN_TYPES, week.skin_type)}
              </text>
              <text x={x(index)} y={bandTop + 48} textAnchor="middle" className="trend-week">
                {week.week_label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <span className="legend">
          <span className="legend-dot" aria-hidden="true" /> Graded from a photo
        </span>
        <span className="legend">
          <span className="legend-dot is-manual" aria-hidden="true" /> Self-reported
        </span>
      </figcaption>
    </figure>
  );
}

function WeekRow({ week, previous }) {
  const delta = previous ? week.severity_level - previous.severity_level : 0;
  const trend = !previous ? "first" : delta < 0 ? "better" : delta > 0 ? "worse" : "same";
  const trendText = {
    first: "First check",
    better: "Improved",
    worse: "Stepped back",
    same: "No change",
  }[trend];

  return (
    <li className="week-row">
      <div className="week-when">
        <span className="week-index">Week {week.week_index}</span>
        <span className="week-dates">{week.week_label}</span>
      </div>
      <div className="week-readings">
        <span className={`severity-pill sev-${week.acne_severity}`}>{labelFor(SEVERITIES, week.acne_severity)}</span>
        <span className="tag">{labelFor(SKIN_TYPES, week.skin_type)} skin</span>
        {week.checks > 1 && <span className="tag">{week.checks} checks</span>}
        {week.referral_needed && <span className="tag tag-butter">Dermatologist suggested</span>}
      </div>
      <span className={`week-delta is-${trend}`}>{trendText}</span>
    </li>
  );
}

export default function Progress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getProgress()
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="container page">
        <Notice tone="error" title="Your progress couldn't be loaded">
          <p>{error}</p>
        </Notice>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container page">
        <p className="rec-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Loading your progress…
        </p>
      </div>
    );
  }

  const { weeks, summary, insights } = data;

  if (weeks.length === 0) {
    return (
      <div className="container page">
        <div className="panel empty">
          <div className="empty-art" aria-hidden="true">
            <ProductArt category="serum" />
          </div>
          <h1>Start tracking your skin</h1>
          <p>
            Skin responds over weeks, not days. Check in once a week and SkinSense will chart how your acne
            severity and skin type change, and tell you whether the routine is working.
          </p>
          <Link to="/analyze" className="btn btn-primary">
            Run your first check
          </Link>
        </div>
      </div>
    );
  }

  const tone = DIRECTION_TONE[summary.direction] || "steady";
  const statusText = (STATUS_TEXT[summary.status] || STATUS_TEXT.none)(summary.days_until_due ?? 0);
  const dueSoon = summary.status === "due" || summary.status === "overdue";

  return (
    <div className="container page progress-page">
      <header className="page-head">
        <div>
          <h1>
            Your skin <span className="accent">progress</span>
          </h1>
          <p>
            One check a week is enough to see a trend. Here is how your acne severity and skin type have
            moved since you started.
          </p>
        </div>
        <Link to="/analyze" className="btn btn-primary">
          New check-in
          <ArrowRightIcon />
        </Link>
      </header>

      <section className={`verdict verdict-${tone}`} aria-labelledby="verdict-heading">
        <div className="verdict-main">
          <p className="verdict-eyebrow">{summary.weeks_tracked} weeks tracked</p>
          <h2 id="verdict-heading" className="verdict-headline">
            {summary.headline}
          </h2>
          <p className="verdict-detail">{summary.detail}</p>
        </div>
        <dl className="verdict-stats">
          <div>
            <dt>Started at</dt>
            <dd>{labelFor(SEVERITIES, summary.first_severity)}</dd>
          </div>
          <div>
            <dt>Now</dt>
            <dd>{labelFor(SEVERITIES, summary.latest_severity)}</dd>
          </div>
          <div>
            <dt>Check-in streak</dt>
            <dd>
              {summary.current_streak} week{summary.current_streak === 1 ? "" : "s"}
            </dd>
          </div>
        </dl>
      </section>

      <div className={`checkin-bar ${dueSoon ? "is-due" : ""}`}>
        <span className="checkin-icon" aria-hidden="true">
          <ClockIcon />
        </span>
        <div className="checkin-text">
          <p className="checkin-status">{statusText}</p>
          <p className="field-hint">
            Last check {formatDate(parseServerDate(summary.last_checked_at), true)}
            {summary.next_due ? `, next due ${formatDate(summary.next_due)}` : ""}
            {summary.weeks_to_next_milestone
              ? `. ${summary.weeks_to_next_milestone} more week${summary.weeks_to_next_milestone === 1 ? "" : "s"} to your next streak milestone.`
              : ""}
          </p>
        </div>
        {dueSoon && (
          <Link to="/analyze" className="btn btn-primary btn-sm">
            Check in now
          </Link>
        )}
      </div>

      <section className="panel trend-panel" aria-labelledby="trend-heading">
        <div className="panel-head">
          <div>
            <h2 id="trend-heading" className="panel-title">
              Week by week
            </h2>
            <p className="panel-sub">Acne severity over time, with the skin type read in the same week.</p>
          </div>
        </div>
        <TrendChart weeks={weeks} />
      </section>

      <div className="progress-grid">
        <section className="panel" aria-labelledby="weeks-heading">
          <h2 id="weeks-heading" className="panel-title">
            Every check-in
          </h2>
          <ol className="week-list">
            {[...weeks].reverse().map((week, index, reversed) => (
              <WeekRow key={week.week_start} week={week} previous={reversed[index + 1]} />
            ))}
          </ol>
        </section>

        <aside className="progress-side">
          <section className="panel" aria-labelledby="insights-heading">
            <h2 id="insights-heading" className="panel-title">
              What this means
            </h2>
            <ul className="insight-list">
              {insights.map((insight) => {
                const Icon = INSIGHT_ICON[insight.tone] || InfoIcon;
                return (
                  <li key={insight.title} className={`insight insight-${insight.tone}`}>
                    <span className="insight-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="insight-title">{insight.title}</p>
                      <p className="insight-text">{insight.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel" aria-labelledby="consistency-heading">
            <h2 id="consistency-heading" className="panel-title">
              Consistency
            </h2>
            <dl className="mini-stats">
              <div>
                <dt>Total checks</dt>
                <dd>{summary.total_checks}</dd>
              </div>
              <div>
                <dt>Weeks tracked</dt>
                <dd>{summary.weeks_tracked}</dd>
              </div>
              <div>
                <dt>Longest streak</dt>
                <dd>{summary.longest_streak}</dd>
              </div>
            </dl>
            <p className="field-hint">
              {summary.skin_type_stable
                ? `Your skin type has read ${labelFor(SKIN_TYPES, summary.dominant_skin_type)} every week.`
                : `Mostly ${labelFor(SKIN_TYPES, summary.dominant_skin_type)}, with some weeks reading differently.`}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

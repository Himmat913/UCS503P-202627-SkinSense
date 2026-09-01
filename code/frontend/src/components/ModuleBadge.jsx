import { MODULES, STATUS } from "../config/features";

/**
 * Renders a module's build status. Every preview or planned feature in the app
 * carries one of these, so a demo can show the full feature set without anyone
 * mistaking fixture output for a trained model.
 */
export default function ModuleBadge({ module, showLive = false }) {
  const entry = MODULES[module];
  if (!entry) return null;
  if (entry.status === "live" && !showLive) return null;

  const status = STATUS[entry.status];

  return (
    <span className={`badge badge-status is-${status.tone}`} title={entry.note}>
      <span className="badge-dot" aria-hidden="true" />
      {status.label}
    </span>
  );
}

/** The explanatory line that usually accompanies the badge. */
export function ModuleNote({ module }) {
  const entry = MODULES[module];
  if (!entry || entry.status === "live") return null;

  return (
    <p className="text-sm muted">
      {entry.status === "planned"
        ? "Not built yet — showing example output so the flow can be reviewed. "
        : "Placeholder data — the endpoint exists but returns fixed values. "}
      {entry.note}
    </p>
  );
}

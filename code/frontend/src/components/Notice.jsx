import { AlertIcon, InfoIcon } from "./Icons";

export default function Notice({ tone = "info", title, children, role }) {
  const Icon = tone === "info" ? InfoIcon : AlertIcon;
  return (
    <div className={`notice notice-${tone}`} role={role || (tone === "error" ? "alert" : "status")}>
      <span className="notice-icon">
        <Icon />
      </span>
      <div className="notice-body">
        {title && <p className="notice-title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";

import { dataSource } from "../api/client";
import { InfoIcon } from "./Icons";

/**
 * Shows once any request has fallen back to fixture data.
 *
 * Polled rather than pushed because `dataSource` is a plain module-level object
 * shared by the client — a store would be more machinery than one banner needs.
 */
export default function DemoBanner() {
  const [visible, setVisible] = useState(dataSource.usedMock);

  useEffect(() => {
    if (visible) return undefined;
    const timer = setInterval(() => {
      if (dataSource.usedMock) setVisible(true);
    }, 500);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="demo-banner">
      <div className="container row" style={{ gap: "0.5rem", flexWrap: "nowrap" }}>
        <InfoIcon />
        <span className="text-sm">
          <strong>Example data.</strong>{" "}
          {dataSource.lastError} Everything below shows the shape of real output, not real
          results.
        </span>
      </div>
    </div>
  );
}

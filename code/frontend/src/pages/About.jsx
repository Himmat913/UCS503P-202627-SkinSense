import { EVALUATION, MODULES, STATUS } from "../config/features";

export default function About() {
  const modules = Object.entries(MODULES);

  return (
    <>
      <header className="page-header">
        <h1>About SkinSense</h1>
        <p>
          A photo-based skin analysis and personalised skincare recommendation platform,
          built as a Software Engineering course project (UCS503P) at Thapar Institute of
          Engineering and Technology.
        </p>
      </header>

      {/* ---------------------------------------------------- architecture */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>How it works</h2>
        <div className="card">
          <div className="card-body">
            <ol className="how-it-works">
              <li>
                <strong>Upload or select.</strong> A face photo is checked by MediaPipe
                (face count, head angle, brightness, blur). If validation fails, specific
                reasons are shown. Or skip the photo and choose your skin type manually.
              </li>
              <li>
                <strong>Classify.</strong> MobileNetV2 predicts skin type (oily / dry /
                normal). ResNet-50 predicts acne severity (mild / moderate / severe),
                following the Zhang &amp; Ma 3-class relabel of ACNE04 by lesion count.
              </li>
              <li>
                <strong>Recommend.</strong> A deterministic, rule-based engine matches
                skin type and severity against a curated product catalog, filters against
                your allergen list and budget, excludes conflicting ingredient pairs, and
                ranks by suitability score.
              </li>
              <li>
                <strong>Build a routine.</strong> Recommended products are ordered into an
                AM/PM routine following the canonical step sequence (cleanser → toner →
                treatment → serum → moisturiser → sunscreen), with conflicts separated
                across the day.
              </li>
              <li>
                <strong>Flag when needed.</strong> If severity is severe, confidence is
                low, or validation found problems, a banner recommends consulting a
                dermatologist.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- module status */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Module status</h2>
        <p className="text-sm muted" style={{ marginBottom: "1rem" }}>
          Every feature in the proposal is listed here with its real build state.
          "Preview" means the endpoint exists but returns placeholder data; "Planned"
          means the page runs on client-side fixtures only.
        </p>

        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {modules.map(([key, mod]) => {
                  const s = STATUS[mod.status];
                  return (
                    <tr key={key}>
                      <td className="cell-name">{mod.name}</td>
                      <td>
                        <span className={`badge badge-status is-${s.tone}`}>
                          <span className="badge-dot" aria-hidden="true" />
                          {s.label}
                        </span>
                      </td>
                      <td>{mod.owner}</td>
                      <td className="text-sm muted">{mod.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- evaluation metrics */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Evaluation criteria</h2>
        <p className="text-sm muted" style={{ marginBottom: "1rem" }}>
          Targets from the submitted proposal, with current readings where available.
        </p>
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Target</th>
                  <th>Current</th>
                </tr>
              </thead>
              <tbody>
                {EVALUATION.map((row) => (
                  <tr key={row.metric}>
                    <td className="cell-name">{row.metric}</td>
                    <td>{row.target}</td>
                    <td className="text-sm muted">{row.current}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- team */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Team</h2>
        <div className="grid-3">
          {[
            {
              name: "Himantveer Kaur",
              roll: "1024170271",
              role: "ML lead (acne severity) · Backend · CI/CD",
            },
            {
              name: "Muskan Kohli",
              roll: "1024170453",
              role: "ML lead (skin type) · Photo validation · Frontend",
            },
            {
              name: "Ansh Bindal",
              roll: "1024170273",
              role: "Recommendation engine · Product DB · Documentation",
            },
          ].map((person) => (
            <div className="card" key={person.roll}>
              <div className="card-body stack" style={{ gap: "0.25rem" }}>
                <span className="card-title">{person.name}</span>
                <span className="text-sm muted">{person.roll}</span>
                <span className="text-sm">{person.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- stack */}
      <section>
        <h2 style={{ marginBottom: "1rem" }}>Stack</h2>
        <div className="card">
          <div className="card-body">
            <div className="grid-2" style={{ gap: "1.5rem" }}>
              <div className="stack" style={{ gap: "0.25rem" }}>
                <span className="metric-label">Frontend</span>
                <span className="text-sm">React (Vite), JavaScript, plain CSS</span>
              </div>
              <div className="stack" style={{ gap: "0.25rem" }}>
                <span className="metric-label">Backend</span>
                <span className="text-sm">FastAPI, Uvicorn, Pydantic, SQLAlchemy</span>
              </div>
              <div className="stack" style={{ gap: "0.25rem" }}>
                <span className="metric-label">ML</span>
                <span className="text-sm">
                  PyTorch + torchvision: MobileNetV2 (skin type), ResNet-50 (acne
                  severity), MediaPipe (validation)
                </span>
              </div>
              <div className="stack" style={{ gap: "0.25rem" }}>
                <span className="metric-label">Data</span>
                <span className="text-sm">
                  SQLite (dev) / PostgreSQL (staging), ACNE04 dataset, curated product
                  catalog
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

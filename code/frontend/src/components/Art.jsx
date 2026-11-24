import { categoryMeta } from "../lib/skin";

const HUES = {
  teal: { main: "#5CC3CC", dark: "#1E8C97" },
  rose: { main: "#E59997", dark: "#C46A68" },
  butter: { main: "#F5CD5B", dark: "#D69B22" },
  coral: { main: "#F58A6B", dark: "#DB5A38" },
  raspberry: { main: "#DD5089", dark: "#A61D52" },
};

const CATEGORY_HUE = {
  cleanser: "teal",
  toner: "rose",
  face_mask: "teal",
  treatment: "coral",
  serum: "raspberry",
  eye_cream: "rose",
  moisturiser: "butter",
  sunscreen: "coral",
};

function Label({ x, y, w, h }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="5" fill="#FFFFFF" opacity="0.92" />
      <rect x={x + 6} y={y + 8} width={w - 12} height="3" rx="1.5" fill="#000857" opacity="0.55" />
      <rect x={x + 6} y={y + 15} width={(w - 12) * 0.6} height="3" rx="1.5" fill="#000857" opacity="0.3" />
    </g>
  );
}

function Shine({ x, y, h }) {
  return <rect x={x} y={y} width="5" height={h} rx="2.5" fill="#FFFFFF" opacity="0.35" />;
}

const SHAPES = {
  pump: ({ main, dark }) => (
    <>
      <rect x="46" y="20" width="30" height="10" rx="4" fill={dark} />
      <rect x="72" y="22" width="20" height="6" rx="3" fill={dark} />
      <rect x="56" y="28" width="8" height="16" fill={dark} />
      <rect x="48" y="42" width="24" height="16" rx="3" fill={dark} />
      <rect x="32" y="56" width="56" height="84" rx="16" fill={main} />
      <Shine x={40} y={66} h={58} />
      <Label x={44} y={86} w={32} h={30} />
    </>
  ),
  dropper: ({ main, dark }) => (
    <>
      <rect x="50" y="12" width="20" height="38" rx="10" fill={dark} />
      <rect x="44" y="46" width="32" height="22" rx="4" fill={dark} />
      <rect x="36" y="66" width="48" height="74" rx="14" fill={main} />
      <Shine x={43} y={74} h={50} />
      <Label x={46} y={90} w={28} h={28} />
    </>
  ),
  jar: ({ main, dark }) => (
    <>
      <rect x="22" y="66" width="76" height="24" rx="7" fill={dark} />
      <rect x="30" y="73" width="60" height="3" rx="1.5" fill="#FFFFFF" opacity="0.25" />
      <rect x="26" y="86" width="68" height="54" rx="14" fill={main} />
      <Shine x={33} y={94} h={34} />
      <Label x={42} y={100} w={36} h={26} />
    </>
  ),
  tube: ({ main, dark }) => (
    <>
      <rect x="32" y="12" width="56" height="12" rx="3" fill={dark} />
      <path d="M34 22h52l-9 94H43z" fill={main} />
      <Shine x={42} y={30} h={70} />
      <Label x={46} y={50} w={28} h={34} />
      <rect x="44" y="114" width="32" height="26" rx="5" fill={dark} />
    </>
  ),
  bottle: ({ main, dark }) => (
    <>
      <rect x="46" y="14" width="28" height="32" rx="6" fill={dark} />
      <rect x="34" y="42" width="52" height="98" rx="14" fill={main} />
      <Shine x={41} y={52} h={74} />
      <Label x={44} y={78} w={32} h={32} />
    </>
  ),
};

export function ProductArt({ category, kind, hue, className = "" }) {
  const meta = categoryMeta(category);
  const shape = SHAPES[kind || meta.art] || SHAPES.bottle;
  const colors = HUES[hue || CATEGORY_HUE[category]] || HUES.rose;
  return (
    <svg className={`product-art ${className}`} viewBox="0 0 120 150" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="143" rx="32" ry="4" fill="#000857" opacity="0.08" />
      {shape(colors)}
    </svg>
  );
}

export function Scribble({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 122 120" fill="none" stroke="#FABF3E" strokeWidth="2.5" aria-hidden="true" focusable="false">
      <circle cx="53.5" cy="66" r="51" />
      <circle cx="61" cy="59.5" r="49.5" />
      <circle cx="69.5" cy="51.5" r="49.5" />
    </svg>
  );
}

export function Sparkle({ className = "", color = "#FABF3E" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20.00 0.00 L22.97 17.03 L40.00 20.00 L22.97 22.97 L20.00 40.00 L17.03 22.97 L0.00 20.00 L17.03 17.03 Z" fill={color} strokeLinejoin="round" />
    </svg>
  );
}

export function DotGrid({ className = "", cols = 5, rows = 4 }) {
  const dots = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      dots.push(<circle key={`${r}-${c}`} cx={4 + c * 12} cy={4 + r * 12} r="2" />);
    }
  }
  return (
    <svg
      className={className}
      viewBox={`0 0 ${8 + (cols - 1) * 12} ${8 + (rows - 1) * 12}`}
      fill="#D9D4E8"
      aria-hidden="true"
      focusable="false"
    >
      {dots}
    </svg>
  );
}

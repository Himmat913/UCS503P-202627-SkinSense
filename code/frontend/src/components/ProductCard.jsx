import { useId, useState } from "react";

import { ProductArt } from "./Art";
import { ChevronDownIcon } from "./Icons";
import { categoryMeta, formatPrice, titleCase } from "../lib/skin";

const TIMING = {
  am: "Morning",
  pm: "Evening",
  both: "Morning and evening",
};

function timingFor(product) {
  if (product.category === "sunscreen") return TIMING.am;
  return TIMING[product.step_time] || null;
}

export default function ProductCard({ product, ingredientInfo }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const meta = categoryMeta(product.category);
  const ingredients = product.key_ingredients || [];
  const shown = ingredients.slice(0, 3);
  const timing = timingFor(product);

  return (
    <article className="product-card">
      <div className={`product-visual tint-${meta.tint}`}>
        <span className="product-arch" aria-hidden="true" />
        <ProductArt category={product.category} className="product-visual-art" />
        <span className="tag product-category">{meta.label}</span>
      </div>

      <div className="product-body">
        <p className="product-brand">{titleCase(product.brand.toLowerCase())}</p>
        <h3 className="product-name">{product.name}</h3>

        {shown.length > 0 && (
          <ul className="product-ingredients" aria-label="Key ingredients">
            {shown.map((ingredient) => (
              <li key={ingredient} className="tag">
                {ingredient}
              </li>
            ))}
            {ingredients.length > shown.length && (
              <li className="tag tag-more">+{ingredients.length - shown.length} more</li>
            )}
          </ul>
        )}

        <div className="product-foot">
          <span className="product-price">{formatPrice(product.price, product.currency)}</span>
          <button
            type="button"
            className={`why-toggle ${open ? "is-open" : ""}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            Why this pick
            <ChevronDownIcon />
          </button>
        </div>

        <div id={panelId} className="why-panel" hidden={!open}>
          <ul className="why-reasons">
            {(product.reasons || []).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {timing && (
            <p className="why-line">
              <strong>When to use:</strong> {timing}
            </p>
          )}
          {ingredients.length > 0 && (
            <div className="why-ingredients">
              <p className="why-subhead">What's in it</p>
              <dl>
                {ingredients.map((name) => {
                  const info = ingredientInfo?.[name.toLowerCase()];
                  return (
                    <div key={name} className="why-ingredient">
                      <dt>{titleCase(name)}</dt>
                      <dd>
                        {info ? info.role : "No reference notes for this ingredient yet."}
                        {info?.caution ? <span className="why-caution"> {info.caution}</span> : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

import { Link } from "react-router-dom";

import { DotGrid, ProductArt, Scribble, Sparkle } from "../components/Art";
import { ArrowRightIcon, CheckIcon, ListIcon, ScanFaceIcon, ShieldIcon } from "../components/Icons";

const STEPS = [
  {
    icon: <ShieldIcon size={30} />,
    title: "Photo check first",
    text: "Before anything is graded, we confirm the photo shows one face, straight on, in usable light.",
    tone: "pink",
  },
  {
    icon: <ScanFaceIcon size={30} />,
    title: "Acne severity, read for you",
    text: "A trained model grades your acne as mild, moderate or severe, and says how sure it is.",
    tone: "mint",
  },
  {
    icon: <ListIcon size={30} />,
    title: "A routine you can follow",
    text: "Morning and evening steps from real products, with clashing ingredients kept apart.",
    tone: "butter",
  },
];

const CONSIDERED = [
  "Your skin type and acne severity",
  "Ingredients or products you want to avoid",
  "Your price limit per product",
  "Actives that shouldn't be used together",
];

const FAQS = [
  {
    q: "Is SkinSense a diagnosis?",
    a: "No. SkinSense is an AI-assisted guide for everyday skincare. It doesn't diagnose skin conditions. If your acne is severe, painful or the result is uncertain, it will suggest seeing a dermatologist.",
  },
  {
    q: "What kind of photo works best?",
    a: "One clear photo of your whole face, looking straight at the camera, in soft even light. Skip filters and heavy makeup. If the photo can't be used, you'll be told exactly why so you can retake it.",
  },
  {
    q: "Why do I choose my skin type myself?",
    a: "Skin type isn't read from photos yet, so you tell us whether your skin is oily, dry or normal. Your answer is combined with the acne severity read from your photo.",
  },
  {
    q: "What happens to my photo?",
    a: "It's uploaded to the SkinSense server, checked, graded, and kept there with your scan. It isn't shown to other users.",
  },
  {
    q: "Can I use it without a photo?",
    a: "Yes. Choose your skin type and acne severity yourself and you'll get recommendations straight from the product catalogue.",
  },
  {
    q: "How are products chosen?",
    a: "From a catalogue of over 1,300 products, matched to your skin type and acne severity, then filtered by your budget and the ingredients you avoid. Products with clashing actives are separated across morning and evening or left out, and every choice shows its reason.",
  },
];

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-art hero-art-left" aria-hidden="true">
            <div className="arch arch-pink">
              <ProductArt category="cleanser" className="hero-product" />
            </div>
            <div className="hero-badge">
              <ShieldIcon size={30} />
            </div>
          </div>

          <div className="hero-copy">
            <Scribble className="hero-scribble" />
            <h1 className="hero-title">
              Skincare that fits <span className="accent">your skin</span>
            </h1>
            <p className="hero-lead">
              Upload a selfie and SkinSense reads your acne severity, then builds a morning and evening
              routine from products matched to your skin type, budget and the ingredients you avoid.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Start a skin check
              </Link>
              <a href="#how-it-works" className="link-arrow">
                How it works
                <ArrowRightIcon />
              </a>
            </div>
            <DotGrid className="hero-dots" />
          </div>

          <div className="hero-art hero-art-right" aria-hidden="true">
            <Sparkle className="hero-sparkle" />
            <div className="arch arch-yellow">
              <ProductArt category="moisturiser" className="hero-product" />
            </div>
          </div>
        </div>

        <div className="container">
          <ul className="feature-row" id="how-it-works">
            {STEPS.map((step) => (
              <li key={step.title} className={`feature feature-${step.tone}`}>
                <span className="feature-icon" aria-hidden="true">
                  {step.icon}
                </span>
                <span className="feature-rule" aria-hidden="true" />
                <div>
                  <h2 className="feature-title">{step.title}</h2>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="split" id="recommendations">
        <div className="container split-grid">
          <div className="split-art" aria-hidden="true">
            <div className="arch arch-peach">
              <ProductArt category="serum" className="split-product split-product-back" />
              <ProductArt category="sunscreen" className="split-product split-product-front" />
            </div>
          </div>
          <div className="split-copy">
            <h2 className="display-heading">
              Every pick comes with a <span className="accent">reason</span>
            </h2>
            <p>
              Recommendations come from a set of clear rules, not guesswork. Open any product to see why it
              was chosen, and anything that was left out is listed with the reason it was dropped.
            </p>
            <ul className="check-list">
              {CONSIDERED.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" className="btn btn-primary">
              Create your account
            </Link>
          </div>
        </div>
      </section>

      <section className="faq" id="faq" aria-labelledby="faq-heading">
        <div className="container faq-inner">
          <h2 id="faq-heading" className="display-heading faq-heading">
            Frequently asked <span className="accent">questions</span>
          </h2>
          <div className="faq-list">
            {FAQS.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>
                  <span>{item.q}</span>
                  <span className="faq-plus" aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="closing">
          <div className="closing-copy">
            <h2 className="display-heading">Ready for your skin check?</h2>
            <p>It takes one photo and about a minute. You can also start without a photo.</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create a free account
              </Link>
              <Link to="/login" className="link-arrow">
                I already have one
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
          <div className="closing-art" aria-hidden="true">
            <div className="closing-circle">
              <ProductArt category="treatment" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

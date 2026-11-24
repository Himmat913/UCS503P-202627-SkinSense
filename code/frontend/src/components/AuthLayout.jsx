import { ProductArt, Sparkle } from "./Art";

export default function AuthLayout({ title, intro, children, aside }) {
  return (
    <div className="container auth">
      <div className="auth-card">
        <div className="auth-form">
          <h1>{title}</h1>
          <p className="auth-intro">{intro}</p>
          {children}
        </div>
        <aside className="auth-aside" aria-hidden="true">
          <Sparkle className="auth-sparkle" color="#FFFFFF" />
          <div className="arch arch-pink auth-arch">
            <ProductArt category="serum" />
          </div>
          <p className="auth-aside-text">{aside}</p>
        </aside>
      </div>
    </div>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { Logo } from "@/components/logo";

// Shared shell for the login / signup screens so they match the landing page:
// warm paper, cherry accents, Plus Jakarta Sans, a brand panel on the left and
// the form on the right. All styles are scoped under `.mr-auth`.

const CSS = `
.mr-auth{
  --bg:#FAF7F5;--surface:#FFFFFF;--tint:#F3EEEB;--primary:#A11E22;--primary-ink:#851519;
  --ink:#2A2320;--body:#5B524E;--muted:#8C827D;--line:#ECE4E0;--ease:cubic-bezier(.22,.61,.36,1);
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  min-height:100vh;display:grid;grid-template-columns:1.05fr 1fr;color:var(--body);background:var(--bg);
  -webkit-font-smoothing:antialiased;
}
.mr-auth *{box-sizing:border-box}
.mr-auth a{text-decoration:none;color:inherit}
.mr-auth h1{margin:0;color:var(--ink);font-weight:800;letter-spacing:-.02em;line-height:1.1}
.mr-auth p{margin:0}

/* left brand panel */
.mr-auth .aside{position:relative;overflow:hidden;background:linear-gradient(150deg,var(--primary),var(--primary-ink));
  color:#fff;padding:56px 52px;display:flex;flex-direction:column;justify-content:space-between}
.mr-auth .aside .wm{position:absolute;right:-60px;bottom:-70px;width:360px;height:360px;opacity:.10;
  background:center/contain no-repeat;filter:brightness(0) invert(1)}
.mr-auth .aside-brand{display:flex;align-items:center;gap:11px;font-weight:800;font-size:19px;letter-spacing:-.02em;position:relative;z-index:1}
.mr-auth .chip{width:38px;height:38px;border-radius:11px;background:#fff;display:grid;place-items:center;box-shadow:0 8px 18px -10px rgba(0,0,0,.4)}
.mr-auth .aside-mid{position:relative;z-index:1}
.mr-auth .aside-mid h2{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.15;margin:0 0 14px;max-width:12em}
.mr-auth .aside-mid p{color:rgba(255,255,255,.8);font-size:15.5px;max-width:24em}
.mr-auth .ticks{list-style:none;padding:0;margin:26px 0 0;display:flex;flex-direction:column;gap:13px}
.mr-auth .ticks li{display:flex;align-items:center;gap:11px;font-weight:600;font-size:15px}
.mr-auth .ticks .tk{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;flex:0 0 auto}
.mr-auth .aside-foot{color:rgba(255,255,255,.65);font-size:13px;position:relative;z-index:1}

/* right form side */
.mr-auth .main{display:flex;align-items:center;justify-content:center;padding:40px 24px}
.mr-auth .card{width:100%;max-width:400px}
.mr-auth .mobile-brand{display:none;align-items:center;gap:10px;font-weight:800;color:var(--ink);font-size:18px;margin-bottom:26px}
.mr-auth .mobile-brand .mchip{width:34px;height:34px;border-radius:10px;background:var(--tint);display:grid;place-items:center}
.mr-auth .card h1{font-size:27px}
.mr-auth .card .sub{margin-top:8px;color:var(--body);font-size:15px}
.mr-auth form{margin-top:26px}
.mr-auth .field{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}
.mr-auth label{font-size:13.5px;font-weight:600;color:var(--ink)}
.mr-auth input,.mr-auth select{height:46px;border:1px solid var(--line);border-radius:12px;padding:0 14px;font-size:15px;
  font-family:inherit;background:#fff;color:var(--ink);transition:border-color .2s,box-shadow .2s;outline:none;width:100%}
.mr-auth input:focus,.mr-auth select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(161,30,34,.14)}
.mr-auth input::placeholder{color:#B9B0AB}
.mr-auth .hint{font-size:12.5px;color:var(--muted);margin-top:-2px}
.mr-auth .err{background:#FBEDEA;border:1px solid #F1D6CF;color:#8A2A22;padding:10px 13px;border-radius:11px;font-size:13.5px;margin-bottom:16px}
.mr-auth .submit{width:100%;height:48px;border:none;border-radius:12px;background:var(--primary);color:#fff;
  font-weight:700;font-size:15px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px;
  transition:background .2s,transform .2s,box-shadow .2s;box-shadow:0 12px 26px -12px rgba(161,30,34,.6)}
.mr-auth .submit:hover{background:var(--primary-ink);transform:translateY(-1px)}
.mr-auth .submit:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
.mr-auth .spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:mr-spin .6s linear infinite}
@keyframes mr-spin{to{transform:rotate(360deg)}}
.mr-auth .foot{margin-top:22px;text-align:center;font-size:14px;color:var(--muted)}
.mr-auth .foot a{color:var(--primary-ink);font-weight:700}
.mr-auth .foot a:hover{text-decoration:underline}

@media (max-width:860px){
  .mr-auth{grid-template-columns:1fr}
  .mr-auth .aside{display:none}
  .mr-auth .mobile-brand{display:flex}
  .mr-auth .main{padding:36px 22px}
}
`;

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AuthSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="submit" disabled={pending}>
      {pending && <span className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mr-auth">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <aside className="aside">
        <a href="/" className="aside-brand">
          <span className="chip"><Logo className="h-7 w-7" /></span>
          MenaxhoRentin
        </a>
        <div className="aside-mid">
          <h2>Platforma e duhur për biznesin tuaj.</h2>
          <p>Makinat, rezervimet dhe klientët, gjithçka në një vend.</p>
          <ul className="ticks">
            <li><span className="tk"><Check /></span> Rezervime online 24/7</li>
            <li><span className="tk"><Check /></span> Kalendar që përditësohet vetë</li>
            <li><span className="tk"><Check /></span> Gati për 5 minuta</li>
          </ul>
        </div>
        <p className="aside-foot">© 2026 MenaxhoRentin</p>
      </aside>

      <main className="main">
        <div className="card">
          <a href="/" className="mobile-brand">
            <span className="mchip"><Logo className="h-6 w-6" /></span>
            MenaxhoRentin
          </a>
          <h1>{title}</h1>
          <p className="sub">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

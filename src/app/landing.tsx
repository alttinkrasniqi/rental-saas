"use client";

import { useEffect } from "react";
import { LOGO_DATA_URI } from "@/lib/logo";

// MenaxhoRentin marketing landing. All styles are scoped under `.mr-landing`
// so nothing here affects the signed-in app. Markup is kept as raw HTML to
// match the approved design 1:1; the small interactions are wired in useEffect.

const CSS = `
.mr-landing{
  --bg:#FAF7F5;--surface:#FFFFFF;--tint:#F3EEEB;--primary:#A11E22;--primary-ink:#851519;
  --primary-soft:#D99A9C;--mist:#F0DCDA;--sky:#EEE7E2;--ink:#2A2320;--body:#5B524E;--muted:#8C827D;
  --line:#ECE4E0;--radius:26px;--radius-sm:16px;--shadow:0 18px 50px -20px rgba(133,21,25,.28);
  --shadow-soft:0 10px 30px -16px rgba(133,21,25,.22);--maxw:1140px;--ease:cubic-bezier(.22,.61,.36,1);
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  color:var(--body);background:var(--bg);-webkit-font-smoothing:antialiased;line-height:1.6;
  overflow-x:hidden;min-height:100vh;position:relative;
}
.mr-landing *{box-sizing:border-box}
.mr-landing a{color:inherit;text-decoration:none}
.mr-landing h1,.mr-landing h2,.mr-landing h3{color:var(--ink);line-height:1.1;letter-spacing:-.02em;margin:0;font-weight:800}
.mr-landing p{margin:0}
.mr-landing .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
.mr-landing .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--primary-ink);background:var(--tint);padding:7px 14px;border-radius:999px;border:1px solid var(--line)}
.mr-landing .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 4px rgba(161,30,34,.18)}
.mr-landing .btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-weight:700;font-size:15px;padding:14px 24px;border-radius:14px;cursor:pointer;border:1px solid transparent;transition:transform .25s var(--ease),box-shadow .25s var(--ease),background .25s var(--ease),color .2s}
.mr-landing .btn-primary{background:var(--primary);color:#fff;box-shadow:0 12px 26px -12px rgba(161,30,34,.65)}
.mr-landing .btn-primary:hover{background:var(--primary-ink);transform:translateY(-2px);box-shadow:0 18px 34px -12px rgba(161,30,34,.7)}
.mr-landing .btn-ghost{background:transparent;color:var(--ink);border-color:var(--line)}
.mr-landing .btn-ghost:hover{background:var(--surface);transform:translateY(-2px);box-shadow:var(--shadow-soft)}
.mr-landing header.nav{position:sticky;top:0;z-index:50;transition:background .3s,border-color .3s,box-shadow .3s}
.mr-landing header.nav.scrolled{background:rgba(244,248,246,.8);backdrop-filter:saturate(1.3) blur(14px);border-bottom:1px solid var(--line)}
.mr-landing .nav-row{display:flex;align-items:center;justify-content:space-between;height:74px}
.mr-landing .brand{display:flex;align-items:center;gap:11px;font-weight:800;color:var(--ink);font-size:19px;letter-spacing:-.02em}
.mr-landing .mark{width:36px;height:36px;background:url(${LOGO_DATA_URI}) center/contain no-repeat;display:block}
.mr-landing .mark svg{display:none}
.mr-landing .brand .accent{color:var(--primary-ink)}
.mr-landing .nav-links{display:flex;align-items:center;gap:34px}
.mr-landing .nav-links a.link{font-weight:600;font-size:15px;color:var(--body);transition:color .2s}
.mr-landing .nav-links a.link:hover{color:var(--ink)}
.mr-landing .nav-cta{display:flex;align-items:center;gap:12px}
.mr-landing .nav-toggle{display:none;background:none;border:none;cursor:pointer;padding:8px}
.mr-landing .nav-toggle svg{display:block}
.mr-landing .hero{position:relative;padding:72px 0 40px}
.mr-landing .hero-bg{position:absolute;inset:0;overflow:hidden;z-index:0}
.mr-landing .hero-bg .blob{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55}
.mr-landing .blob.a{width:520px;height:520px;background:var(--mist);top:-180px;right:-120px}
.mr-landing .blob.b{width:420px;height:420px;background:var(--sky);top:120px;left:-160px;opacity:.45}
.mr-landing .hero .wrap{position:relative;z-index:1}
.mr-landing .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}
.mr-landing h1{font-size:clamp(38px,5vw,62px)}
.mr-landing h1 .hl{color:var(--primary)}
.mr-landing .lead{font-size:clamp(17px,1.4vw,20px);color:var(--body);margin-top:22px;max-width:30em}
.mr-landing .hero-cta{display:flex;flex-wrap:wrap;gap:14px;margin-top:32px}
.mr-landing .microcopy{display:flex;flex-wrap:wrap;gap:18px;margin-top:22px;color:var(--muted);font-size:14px;font-weight:500}
.mr-landing .microcopy span{display:inline-flex;align-items:center;gap:7px}
.mr-landing .check{color:var(--primary)}
.mr-landing .mock{position:relative}
.mr-landing .mock-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:20px;transform:rotate(.6deg)}
.mr-landing .mock-top{display:flex;align-items:center;gap:7px;padding:2px 2px 16px}
.mr-landing .mock-top i{width:11px;height:11px;border-radius:50%;background:#E4ECEA;display:block}
.mr-landing .mock-top i:nth-child(1){background:#F3C9C4}.mr-landing .mock-top i:nth-child(2){background:#F5E2B8}.mr-landing .mock-top i:nth-child(3){background:#C6E6CF}
.mr-landing .mock-title{margin-left:10px;font-size:13px;font-weight:700;color:var(--muted)}
.mr-landing .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.mr-landing .stat{background:var(--tint);border-radius:var(--radius-sm);padding:14px}
.mr-landing .stat .n{font-size:24px;font-weight:800;color:var(--ink);letter-spacing:-.02em}
.mr-landing .stat .l{font-size:12px;color:var(--muted);font-weight:600;margin-top:2px}
.mr-landing .booking{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;background:#fff;border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px 16px}
.mr-landing .booking .car{font-weight:700;color:var(--ink);font-size:15px}
.mr-landing .booking .date{font-size:13px;color:var(--muted);font-weight:500}
.mr-landing .pill{font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;background:rgba(161,30,34,.12);color:var(--primary-ink)}
.mr-landing .cal{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin-top:14px}
.mr-landing .cal span{height:26px;border-radius:8px;background:var(--tint)}
.mr-landing .cal span.on{background:var(--primary-soft)}
.mr-landing .cal span.mid{background:var(--mist)}
.mr-landing .float-badge{position:absolute;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-soft);padding:11px 15px;display:flex;align-items:center;gap:10px;font-weight:700;color:var(--ink);font-size:14px}
.mr-landing .float-badge .ic{width:30px;height:30px;border-radius:9px;background:rgba(161,30,34,.14);display:grid;place-items:center;color:var(--primary)}
.mr-landing .fb1{bottom:-18px;left:-26px;transform:rotate(-2deg)}
.mr-landing .fb2{top:-20px;right:-18px;transform:rotate(2deg)}
.mr-landing section{padding:84px 0;position:relative}
.mr-landing .sec-head{max-width:620px;margin:0 auto 52px;text-align:center}
.mr-landing .sec-head h2{font-size:clamp(28px,3.4vw,42px)}
.mr-landing .sec-head p{margin-top:16px;font-size:17px;color:var(--body)}
.mr-landing .features{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.mr-landing .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:30px;transition:transform .3s var(--ease),box-shadow .3s var(--ease),border-color .3s}
.mr-landing .card:hover{transform:translateY(-4px);box-shadow:var(--shadow-soft);border-color:var(--mist)}
.mr-landing .card .ic{width:48px;height:48px;border-radius:14px;background:var(--tint);display:grid;place-items:center;color:var(--ink);margin-bottom:18px}
.mr-landing .card h3{font-size:20px;margin-bottom:8px}
.mr-landing .card p{font-size:15.5px}
.mr-landing .tint-band{background:var(--tint)}
.mr-landing .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.mr-landing .step{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:30px 28px}
.mr-landing .step .num{width:40px;height:40px;border-radius:12px;background:var(--primary);color:#fff;font-weight:800;display:grid;place-items:center;font-size:17px;margin-bottom:18px}
.mr-landing .step h3{font-size:19px;margin-bottom:7px}
.mr-landing .step p{font-size:15px}
.mr-landing .calm{position:relative;overflow:hidden;border-radius:34px;background:linear-gradient(135deg,#FBF4F2,#F6EEEB 60%,#F1E9E4);border:1px solid var(--line);padding:64px;text-align:center}
.mr-landing .calm h2{font-size:clamp(26px,3vw,38px)}
.mr-landing .calm p{max-width:46em;margin:16px auto 0;font-size:17px;color:var(--body)}
.mr-landing .cta-final{background:linear-gradient(135deg,var(--primary),var(--primary-ink));border-radius:34px;padding:70px 40px;text-align:center;color:#fff;box-shadow:0 30px 60px -28px rgba(133,21,25,.8)}
.mr-landing .cta-final h2{color:#fff;font-size:clamp(28px,3.4vw,44px)}
.mr-landing .cta-final p{color:rgba(255,255,255,.85);margin:16px auto 0;max-width:34em;font-size:17px}
.mr-landing .cta-final .btn-primary{background:#fff;color:var(--primary-ink);margin-top:30px;box-shadow:0 14px 30px -12px rgba(0,0,0,.3)}
.mr-landing .cta-final .btn-primary:hover{background:#F0FAF8}
.mr-landing footer{padding:54px 0 40px;border-top:1px solid var(--line)}
.mr-landing .foot-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}
.mr-landing .foot-links{display:flex;flex-wrap:wrap;gap:26px}
.mr-landing .foot-links a{font-size:14.5px;font-weight:600;color:var(--body)}
.mr-landing .foot-links a:hover{color:var(--ink)}
.mr-landing .copy{color:var(--muted);font-size:13.5px;margin-top:22px}
.mr-landing .reveal{opacity:0;transform:translateY(22px);transition:opacity .7s var(--ease),transform .7s var(--ease)}
.mr-landing .reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.mr-landing .reveal{opacity:1;transform:none;transition:none}}
.mr-landing .mobile-menu{display:none;position:fixed;inset:0;z-index:60;background:rgba(30,48,46,.3);backdrop-filter:blur(3px)}
.mr-landing .mobile-menu .sheet{position:absolute;top:0;right:0;width:84%;max-width:330px;height:100%;background:var(--surface);padding:26px 24px;display:flex;flex-direction:column;gap:6px;box-shadow:-20px 0 60px -20px rgba(0,0,0,.25)}
.mr-landing .mobile-menu a.link{padding:14px 10px;border-radius:12px;font-weight:600;color:var(--body)}
.mr-landing .mobile-menu a.link:hover{background:var(--tint)}
.mr-landing .mobile-menu .btn{margin-top:8px}
.mr-landing .mclose{align-self:flex-end;background:none;border:none;cursor:pointer;padding:8px;margin:-6px -6px 6px}
@media (max-width:900px){
  .mr-landing .hero-grid{grid-template-columns:1fr;gap:44px}
  .mr-landing .mock{order:-1;max-width:460px;margin:0 auto}
  .mr-landing .features,.mr-landing .steps{grid-template-columns:1fr}
  .mr-landing .nav-links{display:none}
  .mr-landing .nav-cta .btn-ghost{display:none}
  .mr-landing .nav-toggle{display:block}
  .mr-landing .calm,.mr-landing .cta-final{padding:44px 26px}
  .mr-landing section{padding:64px 0}
}
@media (max-width:480px){ .mr-landing .hero{padding:48px 0 20px} }
`;

const HTML = `
<header class="nav" id="mr-nav">
  <div class="wrap nav-row">
    <a href="#mr-top" class="brand">
      <span class="mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 13.5l1.4-4.1A3 3 0 018.2 7.3h7.6a3 3 0 012.8 2.1L20 13.5m-16 0h16m-16 0v4.2m16-4.2v4.2M6.5 17.7v1.6m11-1.6v1.6M7 13.3h.01M17 13.3h.01" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      Menaxho<span class="accent">Rentin</span>
    </a>
    <nav class="nav-links">
      <a class="link" href="#mr-features">Veçoritë</a>
      <a class="link" href="#mr-how">Si funksionon</a>
      <a class="link" href="#mr-pricing">Çmimet</a>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-ghost" href="/login">Kyçu</a>
      <a class="btn btn-primary" href="/signup">Fillo falas</a>
      <button class="nav-toggle" id="mr-open" aria-label="Menu"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="#1E302E" stroke-width="2" stroke-linecap="round"/></svg></button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mr-mobile">
  <div class="sheet">
    <button class="mclose" id="mr-close" aria-label="Mbyll"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#1E302E" stroke-width="2" stroke-linecap="round"/></svg></button>
    <a class="link" href="#mr-features">Veçoritë</a>
    <a class="link" href="#mr-how">Si funksionon</a>
    <a class="link" href="#mr-pricing">Çmimet</a>
    <a class="btn btn-ghost" href="/login">Kyçu</a>
    <a class="btn btn-primary" href="/signup">Fillo falas</a>
  </div>
</div>
<span id="mr-top"></span>
<section class="hero">
  <div class="hero-bg"><span class="blob a"></span><span class="blob b"></span></div>
  <div class="wrap hero-grid">
    <div class="reveal">
      <span class="eyebrow"><span class="dot"></span> Platforma për rent-a-car në Kosovë</span>
      <h1 style="margin-top:22px">Menaxho biznesin tënd. <span class="hl">Pa stres.</span></h1>
      <p class="lead">Rezervimet, klientët dhe makinat, të organizuara në një sistem të thjeshtë që ta lehtëson punën e përditshme, të gjitha brenda një platforme të vetme.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/signup">Fillo falas <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="btn btn-ghost" href="#mr-how">Shiko si funksionon</a>
      </div>
      <div class="microcopy">
        <span><svg class="check" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Pa kartë krediti</span>
        <span><svg class="check" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Gati për 5 minuta</span>
        <span><svg class="check" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Në shqip</span>
      </div>
    </div>
    <div class="mock reveal">
      <div class="mock-card">
        <div class="mock-top"><i></i><i></i><i></i><span class="mock-title">Paneli — MenaxhoRentin</span></div>
        <div class="stat-row">
          <div class="stat"><div class="n">6</div><div class="l">Makina të lira</div></div>
          <div class="stat"><div class="n">10</div><div class="l">Të rezervuara</div></div>
          <div class="stat"><div class="n">€10,480</div><div class="l">Këtë muaj</div></div>
        </div>
        <div class="booking"><div><div class="car">VW Golf 8</div><div class="date">12–15 Tetor · Arben K.</div></div><span class="pill">Konfirmuar</span></div>
        <div class="cal"><span></span><span class="on"></span><span class="on"></span><span class="mid"></span><span></span><span class="on"></span><span></span><span class="mid"></span><span></span><span class="on"></span><span class="on"></span><span class="on"></span><span></span><span class="mid"></span></div>
      </div>
      <div class="float-badge fb1"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Rezervim i ri online</div>
      <div class="float-badge fb2"><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Kalendar i qartë</div>
    </div>
  </div>
</section>
<section id="mr-features">
  <div class="wrap">
    <div class="sec-head reveal"><h2>Gjithçka që të duhet. Brenda një platforme.</h2><p>Një platformë e vetme për të mbajtur biznesin tënd të organizuar, nga rezervimi i parë te raporti i fundit të muajit.</p></div>
    <div class="features">
      <div class="card reveal"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div><h3>Faqja jote e rezervimeve</h3><p>Klientët mund të rezervojnë online në çdo kohë, përmes faqes tënde. Ti i menaxhon kërkesat dhe i konfirmon rezervimet me një klik.</p></div>
      <div class="card reveal"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 9h18M8 2v4M16 2v4M8 14h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div><h3>Kalendari live</h3><p>Shiko menjëherë cilat makina janë të lira dhe cilat janë të rezervuara. Kalendari përditësohet automatikisht, që ta kesh gjithmonë të qartë gjendjen e rezervimeve.</p></div>
      <div class="card reveal"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 7v6l9 4 9-4V7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div><h3>Makinat & klientët</h3><p>Makinat, çmimet, fotot dhe historiku i çdo klienti, të gjitha të organizuara në një vend të vetëm.</p></div>
      <div class="card reveal"><div class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h3>Të ardhurat dhe raportet</h3><p>Shiko të ardhurat, identifiko makinat më të kërkuara dhe kontrollo rezervimet e ardhshme. Mbaji rezultatet e biznesit nën vëzhgim, pa pasur nevojë të llogaritësh gjithçka manualisht.</p></div>
    </div>
  </div>
</section>
<section id="mr-how" class="tint-band">
  <div class="wrap">
    <div class="sec-head reveal"><h2>Gati për 5 minuta</h2><p>Konfiguro biznesin tënd në pak hapa dhe bëhu gati për rezervimet e para. Pa instalime dhe pa procese të ndërlikuara.</p></div>
    <div class="steps">
      <div class="step reveal"><div class="num">1</div><h3>Regjistrohu</h3><p>Regjistrohu dhe shto të dhënat e biznesit tënd. Nuk nevojitet kartë krediti.</p></div>
      <div class="step reveal"><div class="num">2</div><h3>Shto makinat</h3><p>Vendos çmimet, fotot dhe të dhënat e makinave që ofron me qira.</p></div>
      <div class="step reveal"><div class="num">3</div><h3>Prano rezervime</h3><p>Ndaje faqen tënde me klientët dhe menaxho rezervimet nga një vend i vetëm.</p></div>
    </div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="calm reveal"><h2>Më pak kokëçarje. Më shumë kontroll.</h2><p>Pa fletore, pa mesazhe të humbura, pa dy klientë për të njëjtën makinë. MenaxhoRentin e mban gjithçka në rregull në sfond, që ti të merresh me atë që ka vërtet rëndësi — klientët e tu.</p></div>
  </div>
</section>
<section id="mr-pricing" class="tint-band">
  <div class="wrap">
    <div class="sec-head reveal"><h2>Fillo falas</h2><p>Gjatë fazës beta, MenaxhoRentin është falas për agjencitë e para. Pa rrezik — provoje dhe shih vetë.</p></div>
    <div class="reveal" style="max-width:420px;margin:0 auto">
      <div class="card" style="text-align:center;padding:40px 32px">
        <div class="eyebrow" style="margin-bottom:16px">Beta</div>
        <div style="font-size:48px;font-weight:800;color:var(--ink);letter-spacing:-.03em">0€<span style="font-size:18px;color:var(--muted);font-weight:600">/muaj</span></div>
        <p style="margin:14px 0 24px">Qasje e plotë në platformë për agjencitë e para që bashkohen.</p>
        <a class="btn btn-primary" href="/signup" style="width:100%">Krijo llogarinë</a>
      </div>
    </div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="cta-final reveal"><h2>Gati ta menaxhosh biznesin pa stres?</h2><p>Bashkohu me agjencitë që tashmë po e mbajnë rent-a-car biznesin e tyre të qetë dhe në rregull.</p><a class="btn btn-primary" href="/signup">Fillo falas sot</a></div>
  </div>
</section>
<footer>
  <div class="wrap">
    <div class="foot-row">
      <a href="#mr-top" class="brand" style="font-size:18px"><span class="mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 13.5l1.4-4.1A3 3 0 018.2 7.3h7.6a3 3 0 012.8 2.1L20 13.5m-16 0h16m-16 0v4.2m16-4.2v4.2M6.5 17.7v1.6m11-1.6v1.6M7 13.3h.01M17 13.3h.01" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Menaxho<span class="accent">Rentin</span></a>
      <div class="foot-links"><a href="#mr-features">Veçoritë</a><a href="#mr-how">Si funksionon</a><a href="#mr-pricing">Çmimet</a><a href="/login">Kyçu</a></div>
    </div>
    <p class="copy">© 2026 MenaxhoRentin · Platformë për menaxhimin e rent-a-car bizneseve.</p>
  </div>
</footer>
`;

export function Landing() {
  useEffect(() => {
    const nav = document.getElementById("mr-nav");
    const onScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const m = document.getElementById("mr-mobile");
    const open = document.getElementById("mr-open");
    const close = document.getElementById("mr-close");
    const openFn = () => { if (m) m.style.display = "block"; };
    const closeFn = () => { if (m) m.style.display = "none"; };
    open?.addEventListener("click", openFn);
    close?.addEventListener("click", closeFn);
    const mClick = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t === m || t.classList?.contains("link")) closeFn();
    };
    m?.addEventListener("click", mClick);

    // Smooth in-page anchor scrolling (scoped to this page's hash links).
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.mr-landing a[href^="#"]')
    );
    const anchorFn = (e: Event) => {
      const a = e.currentTarget as HTMLAnchorElement;
      const href = a.getAttribute("href") || "";
      if (href.length < 2) return;
      const target = document.getElementById(href.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        closeFn();
      }
    };
    anchors.forEach((a) => a.addEventListener("click", anchorFn));

    // Fade-up on scroll.
    let io: IntersectionObserver | null = null;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>(".mr-landing .reveal"));
    try {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("in");
              io?.unobserve(en.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      reveals.forEach((el, i) => {
        el.style.transitionDelay = Math.min(i, 4) * 60 + "ms";
        io!.observe(el);
      });
    } catch {
      reveals.forEach((el) => el.classList.add("in"));
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      open?.removeEventListener("click", openFn);
      close?.removeEventListener("click", closeFn);
      m?.removeEventListener("click", mClick);
      anchors.forEach((a) => a.removeEventListener("click", anchorFn));
      io?.disconnect();
    };
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mr-landing" dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  );
}

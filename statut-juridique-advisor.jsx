import { useState, useEffect } from "react";

// ─── Google Fonts ─────────────────────────────────────────────────────────────
const FONTS = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap";

// ─── Constantes fiscales ──────────────────────────────────────────────────────
const PLAFOND_AE = 77700;
const IS_SEUIL   = 42500;
const FLAT_TAX   = 0.30;
const TMI        = 0.30;

// ─── Moteur de calcul ─────────────────────────────────────────────────────────
const getCA = (jours, tjm, portage) => Math.round(jours * tjm * (1 - portage));

const calcIS = (benefice) => {
  if (benefice <= 0) return 0;
  return Math.round(
    Math.min(benefice, IS_SEUIL) * 0.15 +
    Math.max(0, benefice - IS_SEUIL) * 0.25
  );
};

const calcAE = (ca) => {
  const cotisations = Math.round(ca * 0.265);
  const base_ir     = Math.round(ca * 0.66);
  const ir          = Math.round(base_ir * TMI * 0.85);
  return {
    net: ca - cotisations - ir,
    rows: [
      { label: "CA brut",                       val: ca,          sign:  1 },
      { label: "Cotisations URSSAF 26,5%",      val: cotisations, sign: -1 },
      { label: "IR (abattement 34%, TMI 30%)",  val: ir,          sign: -1 },
    ],
  };
};

const calcSASU = (ca, chargesPro) => {
  const sal_brut = 42000;
  const cotis    = Math.round(sal_brut * 0.78);
  const sal_net  = sal_brut - cotis;
  const ir_sal   = Math.round(sal_net * TMI * 0.82);
  const benefice = ca - sal_brut - chargesPro;
  const impot_is = calcIS(benefice);
  const div_brut = Math.max(0, benefice - impot_is);
  const div_net  = Math.round(div_brut * (1 - FLAT_TAX));
  return {
    net: sal_net - ir_sal + div_net,
    rows: [
      { label: "Salaire brut dirigeant",           val: sal_brut,           sign:  1 },
      { label: "Cotisations assimilé-salarié 78%", val: cotis,              sign: -1 },
      { label: "IR sur salaire net",               val: ir_sal,             sign: -1 },
      { label: "Charges pro déductibles",          val: chargesPro,         sign: -1 },
      { label: "IS 15%/25%",                       val: impot_is,           sign: -1 },
      { label: "Flat tax 30% sur dividendes",      val: div_brut - div_net, sign: -1 },
    ],
  };
};

const calcEURL = (ca, chargesPro) => {
  const rem      = 40000;
  const cot      = Math.round(rem * 0.45);
  const net_tns  = rem - cot;
  const ir       = Math.round(net_tns * TMI * 0.75);
  const benefice = ca - rem - chargesPro;
  const impot_is = calcIS(benefice);
  const div_brut = Math.max(0, benefice - impot_is);
  const div_net  = Math.round(div_brut * (1 - FLAT_TAX));
  return {
    net: net_tns - ir + div_net,
    rows: [
      { label: "Rémunération TNS",          val: rem,                sign:  1 },
      { label: "Cotisations TNS 45%",       val: cot,               sign: -1 },
      { label: "IR sur rémunération nette", val: ir,                 sign: -1 },
      { label: "Charges pro déductibles",   val: chargesPro,         sign: -1 },
      { label: "IS 15%/25%",                val: impot_is,           sign: -1 },
      { label: "Flat tax 30% dividendes",   val: div_brut - div_net, sign: -1 },
    ],
  };
};

const calcSARL = (ca, chargesPro) => {
  const rem      = 38000;
  const cot      = Math.round(rem * 0.45);
  const net_tns  = rem - cot;
  const ir       = Math.round(net_tns * TMI * 0.75);
  const benefice = ca - rem - chargesPro;
  const impot_is = calcIS(benefice);
  const div_brut = Math.max(0, benefice - impot_is);
  const div_net  = Math.round(div_brut * 0.595); // pénalité cotisations gérant maj.
  return {
    net: net_tns - ir + div_net,
    rows: [
      { label: "Rémunération gérant maj.",       val: rem,                sign:  1 },
      { label: "Cotisations TNS 45%",            val: cot,               sign: -1 },
      { label: "IR sur rémunération nette",      val: ir,                 sign: -1 },
      { label: "Charges pro déductibles",        val: chargesPro,         sign: -1 },
      { label: "IS 15%/25%",                     val: impot_is,           sign: -1 },
      { label: "Prélèvements dividendes (maj.)", val: div_brut - div_net, sign: -1 },
    ],
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const eur = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         "#080808",
  surface:    "#0e0e0e",
  border:     "#1c1c1c",
  muted:      "#2e2e2e",
  dimText:    "#484848",
  secText:    "#767676",
  text:       "#e2ddd6",
  accent:     "#c8f5a0",
  accentDim:  "#0e1c09",
  accentBdr:  "#254012",
  warn:       "#fb923c",
  warnDim:    "#130700",
  warnBdr:    "#4a1e00",
  red:        "#f87171",
  redDim:     "#120404",
  redBdr:     "#4a1010",
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function StatutJuridiqueAdvisor() {
  const [tab,       setTab]       = useState(0);
  const [jours,     setJours]     = useState(218);
  const [tjm,       setTjm]       = useState(560);
  const [portage,   setPortage]   = useState(3);
  const [charPro,   setCharPro]   = useState(5832);
  const [openCard,  setOpenCard]  = useState(null);
  const [ready,     setReady]     = useState(false);

  useEffect(() => { setTimeout(() => setReady(true), 80); }, []);

  const ca      = getCA(jours, tjm, portage / 100);
  const depasse = ca - PLAFOND_AE;

  const statuts = [
    { id: "ae",   label: "Auto-entrepreneur", winner: false, warn: depasse > 0, ...calcAE(ca) },
    { id: "sasu", label: "SASU IS",           winner: true,  warn: false,       ...calcSASU(ca, charPro) },
    { id: "eurl", label: "EURL IS",           winner: false, warn: false,       ...calcEURL(ca, charPro) },
    { id: "sarl", label: "SARL IS",           winner: false, warn: false,       ...calcSARL(ca, charPro) },
  ];

  const maxNet   = Math.max(...statuts.map((s) => s.net));
  const sasu     = statuts.find((s) => s.id === "sasu");
  const ae       = statuts.find((s) => s.id === "ae");
  const gainAn   = sasu.net - ae.net;

  const TABS = [
    { label: "Fiscaliste", icon: "⚖️" },
    { label: "Comptable",  icon: "🧮" },
    { label: "Financier",  icon: "📊" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      fontFamily: "'Syne', sans-serif",
      opacity: ready ? 1 : 0,
      transition: "opacity .4s ease",
    }}>
      <link href={FONTS} rel="stylesheet" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{ padding: "32px 44px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, paddingBottom: 24 }}>
          <div>
            <p style={{ fontSize: 10, color: C.dimText, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px" }}>
              Conseil juridique · Optimisation fiscale · 2026
            </p>
            <h1 style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 34,
              color: C.text,
              margin: "0 0 6px",
              lineHeight: 1.15,
            }}>
              Quel statut pour mon activité ?
            </h1>
            <p style={{ fontSize: 12, color: C.secText, margin: 0 }}>
              {jours} j × {tjm} € − {portage}% portage →{" "}
              <span style={{ color: C.text, fontWeight: 500 }}>{eur(ca)}</span> de CA estimé
            </p>
          </div>

          {depasse > 0 && (
            <div style={{
              background: C.redDim,
              border: `1px solid ${C.redBdr}`,
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 12,
              color: C.red,
              maxWidth: 290,
              lineHeight: 1.5,
            }}>
              ⚠️ Plafond AE dépassé de{" "}
              <strong>{eur(depasse)}</strong> — transition urgente
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ display: "flex" }}>
          {TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: tab === i ? `2px solid ${C.accent}` : "2px solid transparent",
                color: tab === i ? C.accent : C.dimText,
                fontFamily: "'Syne', sans-serif",
                fontSize: 12,
                fontWeight: tab === i ? 500 : 400,
                letterSpacing: "0.06em",
                padding: "10px 22px 9px",
                cursor: "pointer",
                transition: "color .2s, border-color .2s",
              }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Sliders toujours visibles ──────────────────────────────── */}
      <section style={{ padding: "20px 44px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 28 }}>
          {[
            { label: "Jours facturés / an", val: jours,   min: 50,    max: 260,   step: 1,    set: setJours,   suffix: " j"  },
            { label: "TJM (€)",             val: tjm,     min: 200,   max: 1500,  step: 10,   set: setTjm,     suffix: " €"  },
            { label: "Portage (%)",         val: portage, min: 0,     max: 10,    step: 0.5,  set: setPortage, suffix: "%"   },
            { label: "Charges pro (€/an)",  val: charPro, min: 0,     max: 20000, step: 100,  set: setCharPro, suffix: " €"  },
          ].map((p) => (
            <div key={p.label} style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "11px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 10, color: C.dimText, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {p.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                  {p.val}{p.suffix}
                </span>
              </div>
              <input
                type="range"
                min={p.min} max={p.max} step={p.step} value={p.val}
                onChange={(e) => p.set(Number(e.target.value))}
                style={{ width: "100%", accentColor: C.accent, cursor: "pointer" }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Contenu onglets ───────────────────────────────────────── */}
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "0 44px 80px" }}>

        {/* ── FISCALISTE ─────────────────────────────────────────── */}
        {tab === 0 && (
          <div>
            <SectionTitle>Panorama des 4 statuts</SectionTitle>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 24 }}>
              {statuts.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setOpenCard(openCard === s.id ? null : s.id)}
                  style={{
                    background: s.winner ? C.accentDim : s.warn ? C.redDim : C.surface,
                    border: `1px solid ${s.winner ? C.accentBdr : s.warn ? C.redBdr : C.border}`,
                    borderRadius: 10,
                    padding: "16px 18px",
                    cursor: "pointer",
                    transition: "border-color .15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{s.label}</span>
                    {s.winner && <Pill color={C.accent}  bg={C.accentDim} bdr={C.accentBdr}>Recommandé</Pill>}
                    {s.warn   && <Pill color={C.red}     bg={C.redDim}    bdr={C.redBdr}>⚠ Plafond</Pill>}
                  </div>

                  <div style={{ fontSize: 21, fontWeight: 500, color: s.winner ? C.accent : C.text, marginBottom: 10 }}>
                    {eur(s.net)}
                    <span style={{ fontSize: 10, color: C.dimText, fontWeight: 400, marginLeft: 4 }}>/an net</span>
                  </div>

                  <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 10 }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.round(Math.max(0, s.net) / maxNet * 100)}%`,
                      background: s.winner ? C.accent : C.muted,
                      borderRadius: 2,
                      transition: "width .8s ease",
                    }} />
                  </div>

                  {openCard === s.id && (
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 4 }}>
                      {s.rows.map((r, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.secText, marginBottom: 4 }}>
                          <span>{r.sign === -1 ? "−" : "+"} {r.label}</span>
                          <span style={{ color: r.sign === -1 ? C.dimText : C.text }}>
                            {r.sign === -1 ? "−" : "+"}{eur(r.val)}
                          </span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 500, borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, color: s.winner ? C.accent : C.text }}>
                        <span>Net disponible</span>
                        <span>{eur(s.net)}</span>
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: C.dimText, margin: "8px 0 0", textAlign: "center" }}>
                    {openCard === s.id ? "▲ masquer" : "▼ détail"}
                  </p>
                </div>
              ))}
            </div>

            <Card>
              <Label small>Points fiscaux clés</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {[
                  ["IS 15%",             "Applicable jusqu'à 42 500 € de bénéfice en SASU, EURL, SARL. Très avantageux vs TMI 30% en IR direct."],
                  ["Flat tax",           "Dividendes SASU/EURL taxés 30% (PFU). En SARL gérant maj., dividendes > 10% du capital soumis cotisations TNS."],
                  ["Charges déductibles","En société : voiture, leasing, téléphone, matériel déduits du résultat. En AE : zéro déduction possible."],
                  ["TVA",                "Franchise AE sous le plafond. En société, TVA collectée mais récupérable sur les achats professionnels."],
                  ["CFE",                "Cotisation Foncière des Entreprises due dès la 2e année dans tous les statuts (200–1 500 €/an selon commune)."],
                  ["ACRE terminé",       `Taux plein URSSAF 26,5% s'applique désormais. Sur un CA de ${eur(ca)}, les cotisations AE seules atteignent ${eur(Math.round(ca * 0.265))}.`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: C.accent, fontWeight: 500, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 12, color: C.secText, lineHeight: 1.65 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── COMPTABLE ──────────────────────────────────────────── */}
        {tab === 1 && (
          <div>
            <SectionTitle>Analyse de ta situation</SectionTitle>

            {depasse > 0 && (
              <div style={{
                background: C.redDim,
                border: `1px solid ${C.redBdr}`,
                borderRadius: 10,
                padding: "14px 18px",
                marginBottom: 20,
                fontSize: 13,
                color: C.red,
                lineHeight: 1.7,
              }}>
                <strong>⚠️ Alerte plafond AE</strong><br />
                CA estimé <strong>{eur(ca)}</strong> — dépassement de{" "}
                <strong>{eur(depasse)}</strong> au-dessus de 77 700 €. Si le plafond est franchi en cours d'année,
                la TVA est due rétroactivement au 1er janvier. À ce rythme : seuil atteint{" "}
                <strong>juin–juillet 2026</strong>.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
              {[
                { lbl: "CA annuel estimé",        val: eur(ca),      warn: false },
                { lbl: "Dépassement plafond AE",  val: eur(depasse), warn: depasse > 0 },
                { lbl: "Charges pro déductibles", val: eur(charPro), warn: false },
                { lbl: "Charges perso annuelles", val: eur(15600),   warn: false },
                { lbl: "TMI estimée",             val: "30 %",       warn: false },
                { lbl: "Durée contrat",           val: "3 ans",      warn: false },
              ].map((m) => (
                <div key={m.lbl} style={{
                  background: m.warn ? C.redDim : C.surface,
                  border: `1px solid ${m.warn ? C.redBdr : C.border}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 10, color: C.dimText, marginBottom: 4 }}>{m.lbl}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: m.warn ? C.red : C.text }}>{m.val}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: C.accentDim,
              border: `1px solid ${C.accentBdr}`,
              borderRadius: 10,
              padding: "18px 22px",
              marginBottom: 14,
            }}>
              <Label small accent>Recommandation</Label>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.accent, marginBottom: 10 }}>
                Statut conseillé : SASU à l'IS
              </div>
              <p style={{ fontSize: 13, color: "#8abf8a", lineHeight: 1.75, margin: "0 0 12px" }}>
                Rester en AE est impossible (plafond dépassé de {eur(depasse)}) et fiscalement pénalisant —
                tu perds {eur(charPro)} de déductions annuelles. La SASU permet de :
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {[
                  "Déduire toutes les charges professionnelles du résultat imposable",
                  "Te verser ~3 000–3 500 €/mois brut, optimisé à l'IR",
                  "Distribuer le surplus en dividendes à la flat tax 30%",
                  "Conserver la protection sociale d'assimilé-salarié",
                  "Bénéficier de l'IS à 15% sur les premiers 42 500 €",
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: 12, color: "#8abf8a", marginBottom: 6, display: "flex", gap: 8 }}>
                    <span style={{ color: C.accent, flexShrink: 0 }}>→</span>{item}
                  </li>
                ))}
              </ul>
            </div>

            <Card>
              <Label small>Planning de transition</Label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 90, top: 8, bottom: 8, width: 1, background: C.border }} />
                {[
                  ["Maintenant",  "Choisir un expert-comptable et lancer la constitution SASU (délai 2–4 semaines)"],
                  ["Mai–juin 26", "SASU active avant d'atteindre le plafond AE"],
                  ["Juillet 26",  "Fermeture auto-entreprise après radiation officielle"],
                  ["Août 26",     "Contrat de prestation transféré sur la SASU"],
                ].map(([date, action]) => (
                  <div key={date} style={{ display: "flex", gap: 16, marginBottom: 14, alignItems: "flex-start", fontSize: 12 }}>
                    <div style={{ color: C.dimText, fontStyle: "italic", minWidth: 90, flexShrink: 0, textAlign: "right", paddingTop: 1 }}>
                      {date}
                    </div>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.muted, flexShrink: 0, marginTop: 4, position: "relative", zIndex: 1 }} />
                    <div style={{ color: C.secText, lineHeight: 1.6 }}>{action}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── FINANCIER ──────────────────────────────────────────── */}
        {tab === 2 && (
          <div>
            <SectionTitle>Modélisation financière</SectionTitle>

            <Card style={{ marginBottom: 14 }}>
              <Label small>Revenu net annuel estimé — {eur(ca)} de CA</Label>
              {statuts.map((s) => (
                <div key={s.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: s.winner ? C.accent : C.secText }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: s.winner ? C.accent : C.text }}>
                      {eur(s.net)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.round(Math.max(0, s.net) / maxNet * 100)}%`,
                      background: s.winner ? C.accent : C.muted,
                      borderRadius: 3,
                      transition: "width .9s ease",
                    }} />
                  </div>
                </div>
              ))}
            </Card>

            <div style={{ background: C.accentDim, border: `1px solid ${C.accentBdr}`, borderRadius: 10, padding: "18px 22px", marginBottom: 14 }}>
              <Label small accent>Détail SASU IS</Label>
              <div style={{ fontSize: 12, color: "#8abf8a", marginBottom: 10 }}>
                CA de départ : <strong style={{ color: C.text }}>{eur(ca)}</strong>
              </div>
              {sasu.rows.map((r, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 12,
                  padding: "5px 0",
                  borderTop: "1px solid #0d2210",
                  color: r.sign === -1 ? "#4a7a54" : C.text,
                }}>
                  <span>{r.sign === -1 ? "−" : "+"} {r.label}</span>
                  <span style={{ fontWeight: 500 }}>{r.sign === -1 ? "−" : "+"}{eur(r.val)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 500, borderTop: `1px solid ${C.accentBdr}`, paddingTop: 10, marginTop: 4, color: C.accent }}>
                <span>Net disponible</span>
                <span>{eur(sasu.net)}</span>
              </div>
            </div>

            <Card style={{ marginBottom: 14 }}>
              <Label small>Projection 3 ans (durée contrat)</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { lbl: "Net annuel SASU",    val: eur(sasu.net),    sub: "estimé stable",    accent: false },
                  { lbl: "Gain vs AE / an",    val: eur(gainAn),      sub: "différence nette", accent: true  },
                  { lbl: "Gain cumulé 3 ans",  val: eur(gainAn * 3),  sub: "gain total",       accent: true  },
                ].map((p) => (
                  <div key={p.lbl} style={{
                    background: p.accent ? C.accentDim : "#0a0a0a",
                    border: `1px solid ${p.accent ? C.accentBdr : C.border}`,
                    borderRadius: 8,
                    padding: "14px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 10, color: C.dimText, marginBottom: 4 }}>{p.lbl}</div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: p.accent ? C.accent : C.text }}>{p.val}</div>
                    <div style={{ fontSize: 10, color: C.dimText, marginTop: 2 }}>{p.sub}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ border: `1px solid ${C.accentBdr}`, borderRadius: 10, padding: "18px 22px", background: C.accentDim }}>
              <Label small accent>Verdict financier</Label>
              <p style={{ fontSize: 13, color: "#8abf8a", lineHeight: 1.8, margin: 0 }}>
                La <strong style={{ color: C.text }}>SASU IS</strong> génère{" "}
                <strong style={{ color: C.accent }}>{eur(gainAn)} de plus par an</strong> qu'en AE,
                soit <strong style={{ color: C.accent }}>{eur(gainAn * 3)} sur 3 ans</strong>.
                La transition est non seulement fiscalement avantageuse mais obligatoire — le plafond AE sera
                atteint mi-2026. La comptabilité SASU (~2 000 €/an) est largement compensée par le gain net.
              </p>
            </div>

            <p style={{ fontSize: 10, color: C.dimText, textAlign: "center", marginTop: 16 }}>
              Estimations indicatives · IS 15% &lt; 42 500 €, flat tax 30%, TMI 30% · À valider avec un expert-comptable
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Micro-composants ─────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: "'Instrument Serif', serif",
      fontStyle: "italic",
      fontWeight: 400,
      fontSize: 24,
      color: "#e2ddd6",
      margin: "0 0 20px",
    }}>
      {children}
    </h2>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#0e0e0e",
      border: "1px solid #1c1c1c",
      borderRadius: 10,
      padding: "18px 20px",
      marginBottom: 14,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children, small, accent }) {
  return (
    <div style={{
      fontSize: 10,
      color: accent ? "#c8f5a0" : "#484848",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Pill({ children, color, bg, bdr }) {
  return (
    <span style={{
      fontSize: 10,
      padding: "2px 8px",
      borderRadius: 999,
      background: bg,
      color,
      border: `1px solid ${bdr}`,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

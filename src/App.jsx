import React, { useState, useMemo } from "react";

// ============================================================
// SNF Revenue Cycle Billing Tool
// Covers: PDPM rate build-up, Medicare benefit-period day tracking
// (days 1-20 / 21-100 coinsurance), claim tracking & denial mgmt.
// 2026 figures are placeholders — verify against current CMS rates.
// ============================================================

const C = {
  ink: "#1a1d29",
  paper: "#f4f1ea",
  card: "#fffdf8",
  line: "#d8d2c4",
  teal: "#0e6b6b",
  tealDk: "#094f4f",
  gold: "#b08527",
  red: "#9e2b25",
  green: "#2f6b3a",
  amber: "#a8730f",
  muted: "#6b6557",
};

// 2026 SNF Medicare placeholders — REPLACE with current CMS values
const PART_A_DAILY_COINS = 217.0; // days 21-100 beneficiary coinsurance (placeholder)

// PDPM component base rates (urban, unadjusted, placeholder daily $)
const PDPM_BASE = {
  PT: 65.5, OT: 61.0, SLP: 25.0, NTA: 85.0, Nursing: 115.0, NCMO: 100.0,
};

// Case-mix index lookups (illustrative subset)
const CMI = {
  PT: { TA: 1.53, TB: 1.71, TC: 1.78, TD: 1.42, TE: 1.16, TF: 1.0, TG: 0.85, TH: 0.71, TI: 0.55, TJ: 0.44, TK: 0.34, TL: 0.22, TM: 0.74, TN: 0.62, TO: 0.5, TP: 0.32 },
  OT: { TA: 1.49, TB: 1.63, TC: 1.68, TD: 1.41, TE: 1.18, TF: 1.0, TG: 0.86, TH: 0.73, TI: 0.58, TJ: 0.46, TK: 0.36, TL: 0.24, TM: 0.75, TN: 0.64, TO: 0.52, TP: 0.34 },
  SLP: { SA: 0.68, SB: 1.6, SC: 2.0, SD: 1.31, SE: 2.27, SF: 2.66, SG: 1.94, SH: 2.9, SI: 3.32, SJ: 2.6, SK: 3.56, SL: 4.21 },
  NTA: { NA: 3.25, NB: 2.53, NC: 1.85, ND: 1.34, NE: 0.96, NF: 0.72 },
  Nursing: { ES3: 4.04, ES2: 3.06, ES1: 2.91, HDE2: 2.39, HDE1: 1.99, HBC2: 2.24, HBC1: 1.85, LDE2: 2.0, LDE1: 1.66, LBC2: 1.74, LBC1: 1.44, CDE2: 1.86, CDE1: 1.54, CBC2: 1.7, CBC1: 1.41, CA2: 1.05, CA1: 0.87, BAB2: 1.1, BAB1: 0.97, PDE2: 1.57, PDE1: 1.3, PBC2: 1.44, PBC1: 1.19, PA2: 0.7, PA1: 0.58 },
};

const VARIABLE_PT_OT = (day) => (day <= 20 ? 1.0 : Math.max(1.0 - 0.02 * (Math.floor((day - 21) / 7) + 1), 0.76));
const VARIABLE_NTA = (day) => (day <= 3 ? 3.0 : 1.0);

const money = (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: C.muted, textTransform: "uppercase" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: C.muted }}>{hint}</span>}
    </label>
  );
}

const selStyle = { padding: "9px 10px", border: `1px solid ${C.line}`, borderRadius: 6, background: C.card, fontSize: 14, color: C.ink, fontFamily: "inherit" };
const inStyle = { ...selStyle };

// -------------------- PDPM Calculator --------------------
function PDPMCalc() {
  const [wage, setWage] = useState(1.0);
  const [day, setDay] = useState(1);
  const [grp, setGrp] = useState({ PT: "TF", OT: "TF", SLP: "SC", NTA: "ND", Nursing: "HDE2" });

  const rows = useMemo(() => {
    const ptOtAdj = VARIABLE_PT_OT(Number(day));
    const ntaAdj = VARIABLE_NTA(Number(day));
    const build = (comp, varAdj = 1) => {
      const cmi = CMI[comp][grp[comp]] ?? 1;
      const base = PDPM_BASE[comp];
      const adjBase = comp === "NCMO" ? base : base * Number(wage);
      const amt = adjBase * cmi * varAdj;
      return { comp, group: grp[comp] || "—", cmi, varAdj, amt };
    };
    return [
      build("PT", ptOtAdj),
      build("OT", ptOtAdj),
      build("SLP"),
      build("NTA", ntaAdj),
      build("Nursing"),
      { comp: "NCMO", group: "flat", cmi: 1, varAdj: 1, amt: PDPM_BASE.NCMO },
    ];
  }, [wage, day, grp]);

  const total = rows.reduce((s, r) => s + r.amt, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginBottom: 18 }}>
        <Field label="Wage Index" hint="CBSA-specific, from CMS">
          <input style={inStyle} type="number" step="0.01" value={wage} onChange={(e) => setWage(e.target.value)} />
        </Field>
        <Field label="Day of Stay" hint="Drives variable per-diem">
          <input style={inStyle} type="number" min="1" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        {["PT", "OT", "SLP", "NTA", "Nursing"].map((c) => (
          <Field key={c} label={`${c} Group`}>
            <select style={selStyle} value={grp[c]} onChange={(e) => setGrp({ ...grp, [c]: e.target.value })}>
              {Object.keys(CMI[c]).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: C.tealDk, color: "#fff" }}>
              {["Component", "Group", "CMI", "Variable Adj", "Per-Diem"].map((h) => (
                <th key={h} style={{ textAlign: h === "Per-Diem" ? "right" : "left", padding: "10px 12px", fontSize: 12, letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.comp} style={{ background: i % 2 ? C.paper : C.card }}>
                <td style={{ padding: "9px 12px", fontWeight: 600 }}>{r.comp}</td>
                <td style={{ padding: "9px 12px" }}>{r.group}</td>
                <td style={{ padding: "9px 12px" }}>{r.cmi.toFixed(2)}</td>
                <td style={{ padding: "9px 12px" }}>{r.varAdj.toFixed(2)}×</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(r.amt)}</td>
              </tr>
            ))}
            <tr style={{ background: C.gold, color: C.ink, fontWeight: 700 }}>
              <td style={{ padding: "11px 12px" }} colSpan={4}>Total PDPM Per-Diem (Day {day})</td>
              <td style={{ padding: "11px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
        Base rates, CMIs, and adjustments are illustrative placeholders. Replace PDPM_BASE / CMI tables with the current CMS SNF PPS final-rule values for accurate billing.
      </p>
    </div>
  );
}

// -------------------- Benefit Period Tracker --------------------
function BenefitPeriod() {
  const [admit, setAdmit] = useState("");
  const [los, setLos] = useState(30);
  const [priorUsed, setPriorUsed] = useState(0);
  const [perDiem, setPerDiem] = useState(620);

  const calc = useMemo(() => {
    const stay = Math.max(0, Number(los));
    const start = Number(priorUsed);
    let fullDays = 0, coinsDays = 0, exhaustedDays = 0;
    for (let i = 0; i < stay; i++) {
      const bd = start + i + 1; // benefit-day number
      if (bd <= 20) fullDays++;
      else if (bd <= 100) coinsDays++;
      else exhaustedDays++;
    }
    const pd = Number(perDiem);
    const medicarePays = fullDays * pd + coinsDays * Math.max(pd - PART_A_DAILY_COINS, 0);
    const beneficiaryOwes = coinsDays * Math.min(PART_A_DAILY_COINS, pd) + exhaustedDays * pd;
    return { fullDays, coinsDays, exhaustedDays, medicarePays, beneficiaryOwes };
  }, [los, priorUsed, perDiem]);

  const Stat = ({ label, val, color }) => (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || C.ink, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{val}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 20 }}>
        <Field label="Admit Date"><input style={inStyle} type="date" value={admit} onChange={(e) => setAdmit(e.target.value)} /></Field>
        <Field label="Length of Stay (days)"><input style={inStyle} type="number" min="0" value={los} onChange={(e) => setLos(e.target.value)} /></Field>
        <Field label="Benefit Days Already Used" hint="0–100 from prior SNF stays this period"><input style={inStyle} type="number" min="0" max="100" value={priorUsed} onChange={(e) => setPriorUsed(e.target.value)} /></Field>
        <Field label="Daily Rate (PDPM)"><input style={inStyle} type="number" step="0.01" value={perDiem} onChange={(e) => setPerDiem(e.target.value)} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Stat label="Full-Coverage Days (1–20)" val={calc.fullDays} color={C.green} />
        <Stat label="Coinsurance Days (21–100)" val={calc.coinsDays} color={C.amber} />
        <Stat label="Exhausted Days (101+)" val={calc.exhaustedDays} color={C.red} />
        <Stat label="Est. Medicare Pays" val={money(calc.medicarePays)} color={C.teal} />
        <Stat label="Est. Beneficiary Owes" val={money(calc.beneficiaryOwes)} color={C.ink} />
      </div>
      <p style={{ fontSize: 11, color: C.muted, marginTop: 12 }}>
        Part A SNF coinsurance ({money(PART_A_DAILY_COINS)}/day) is a placeholder for CY2026 — confirm the current CMS figure. A benefit period resets after 60 consecutive days off Part A inpatient/SNF care. Requires a qualifying 3-day inpatient hospital stay.
      </p>
    </div>
  );
}

// -------------------- Claim Tracker --------------------
const SEED = [
  { id: "C-10481", res: "Alvarez, M.", type: "Part A", from: "2026-04-01", to: "2026-04-30", days: 30, charge: 18600, status: "Paid", paid: 17240, denial: "" },
  { id: "C-10482", res: "Becker, R.", type: "Part A", from: "2026-04-05", to: "2026-04-28", days: 24, charge: 14880, status: "Denied", paid: 0, denial: "56900 – Missing 3-day qualifying stay" },
  { id: "C-10483", res: "Cho, L.", type: "Part B", from: "2026-04-01", to: "2026-04-30", days: 30, charge: 4200, status: "Submitted", paid: 0, denial: "" },
  { id: "C-10484", res: "Davis, K.", type: "Part A", from: "2026-04-10", to: "2026-04-30", days: 20, charge: 12400, status: "RTP", paid: 0, denial: "U5181 – Invalid HIPPS / assessment mismatch" },
  { id: "C-10485", res: "Esposito, T.", type: "Managed", from: "2026-04-01", to: "2026-04-25", days: 25, charge: 15500, status: "Pending Auth", paid: 0, denial: "" },
];

const STATUS_COLOR = { Paid: C.green, Denied: C.red, RTP: C.amber, Submitted: C.teal, "Pending Auth": C.gold, Draft: C.muted };

function ClaimTracker() {
  const [claims, setClaims] = useState(SEED);
  const [filter, setFilter] = useState("All");

  const setStatus = (id, status) => setClaims(claims.map((c) => (c.id === id ? { ...c, status } : c)));

  const shown = filter === "All" ? claims : claims.filter((c) => c.status === filter);
  const totals = useMemo(() => ({
    billed: claims.reduce((s, c) => s + c.charge, 0),
    collected: claims.reduce((s, c) => s + c.paid, 0),
    ar: claims.filter((c) => !["Paid"].includes(c.status)).reduce((s, c) => s + c.charge, 0),
    denied: claims.filter((c) => ["Denied", "RTP"].includes(c.status)).reduce((s, c) => s + c.charge, 0),
  }), [claims]);
  const collectionRate = totals.billed ? (totals.collected / totals.billed) * 100 : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          ["Total Billed", money(totals.billed), C.ink],
          ["Collected", money(totals.collected), C.green],
          ["Open A/R", money(totals.ar), C.amber],
          ["Denied / RTP", money(totals.denied), C.red],
          ["Collection Rate", `${collectionRate.toFixed(1)}%`, C.teal],
        ].map(([l, v, col]) => (
          <div key={l} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: C.muted, fontWeight: 600 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: col, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {["All", "Submitted", "Pending Auth", "RTP", "Denied", "Paid"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 13px", borderRadius: 20, border: `1px solid ${C.line}`, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: filter === f ? C.tealDk : C.card, color: filter === f ? "#fff" : C.ink, fontFamily: "inherit",
          }}>{f}</button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.tealDk, color: "#fff" }}>
              {["Claim", "Resident", "Payer", "Service Span", "Days", "Charges", "Paid", "Status", "Edit / Denial"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "9px 10px", fontSize: 11, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 ? C.paper : C.card, borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: "9px 10px", fontWeight: 600 }}>{c.id}</td>
                <td style={{ padding: "9px 10px" }}>{c.res}</td>
                <td style={{ padding: "9px 10px" }}>{c.type}</td>
                <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>{c.from} → {c.to}</td>
                <td style={{ padding: "9px 10px" }}>{c.days}</td>
                <td style={{ padding: "9px 10px", fontVariantNumeric: "tabular-nums" }}>{money(c.charge)}</td>
                <td style={{ padding: "9px 10px", fontVariantNumeric: "tabular-nums" }}>{money(c.paid)}</td>
                <td style={{ padding: "9px 10px" }}>
                  <span style={{ background: STATUS_COLOR[c.status], color: "#fff", padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{c.status}</span>
                </td>
                <td style={{ padding: "9px 10px", minWidth: 200 }}>
                  {c.denial ? <span style={{ color: C.red, fontSize: 12 }}>{c.denial}</span> : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
                  <div style={{ marginTop: 4 }}>
                    <select value={c.status} onChange={(e) => setStatus(c.id, e.target.value)} style={{ ...selStyle, padding: "4px 6px", fontSize: 12 }}>
                      {["Draft", "Submitted", "Pending Auth", "RTP", "Denied", "Paid"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------- Clean Claim Checklist --------------------
const CHECKS = [
  "Qualifying 3-day inpatient hospital stay documented",
  "5-day PPS MDS assessment completed & transmitted",
  "Valid HIPPS code matches MDS assessment",
  "Physician certification / recertification on file",
  "Benefit days verified (CWF / eligibility check)",
  "Consolidated billing services bundled correctly",
  "Occurrence span codes & value codes present",
  "Diagnosis (ICD-10) supports skilled level of care",
  "No overlapping Part A claim for service span",
  "Demand/no-pay bill submitted if MA plan primary",
];

function CleanClaim() {
  const [done, setDone] = useState({});
  const pct = Math.round((Object.values(done).filter(Boolean).length / CHECKS.length) * 100);
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 10, background: C.line, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.green : C.gold, transition: "width .3s" }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginTop: 6 }}>{pct}% complete — {pct === 100 ? "ready to bill" : "incomplete, hold claim"}</div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {CHECKS.map((ch, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: done[i] ? "#eef5ee" : C.card, border: `1px solid ${done[i] ? C.green : C.line}`, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={!!done[i]} onChange={() => setDone({ ...done, [i]: !done[i] })} style={{ width: 17, height: 17, accentColor: C.teal }} />
            <span style={{ textDecoration: done[i] ? "line-through" : "none", color: done[i] ? C.muted : C.ink }}>{ch}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// -------------------- Shell --------------------
const TABS = [
  { id: "pdpm", label: "PDPM Rate Calculator", el: <PDPMCalc /> },
  { id: "benefit", label: "Benefit Period & Coverage", el: <BenefitPeriod /> },
  { id: "claims", label: "Claim Tracker & Denials", el: <ClaimTracker /> },
  { id: "clean", label: "Clean-Claim Checklist", el: <CleanClaim /> },
];

export default function App() {
  const [tab, setTab] = useState("pdpm");
  const active = TABS.find((t) => t.id === tab);
  return (
    <div style={{ fontFamily: "'Georgia', serif", background: C.paper, color: C.ink, minHeight: "100vh", padding: "0 0 40px" }}>
      <header style={{ background: C.tealDk, color: "#fff", padding: "26px 32px", borderBottom: `4px solid ${C.gold}`, position: "relative" }}>
        <span style={{ position: "absolute", top: 18, right: 24, background: C.gold, color: C.ink, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", padding: "5px 11px", borderRadius: 4, fontFamily: "system-ui" }}>Demo · Illustrative Rates</span>
        <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C.gold, fontWeight: 700, fontFamily: "system-ui" }}>Skilled Nursing Facility</div>
        <h1 style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 700 }}>Revenue Cycle Billing Tool</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#cfe3e3", fontFamily: "system-ui" }}>Medicare Part A PDPM rate build-up · benefit-period day tracking · claim & denial management</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.gold, fontFamily: "system-ui" }}>North Bridge Solutions · Madison, Wisconsin · Fragmented Data → Leadership Success</p>
      </header>

      <nav style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "16px 32px 0", background: C.paper, borderBottom: `1px solid ${C.line}` }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "11px 18px", border: "none", borderBottom: tab === t.id ? `3px solid ${C.gold}` : "3px solid transparent",
            background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "system-ui",
            color: tab === t.id ? C.tealDk : C.muted,
          }}>{t.label}</button>
        ))}
      </nav>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "26px 28px", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 21, color: C.tealDk }}>{active.label}</h2>
          {active.el}
        </div>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 16, fontFamily: "system-ui", lineHeight: 1.6 }}>
          Decision-support tool only. All rates, case-mix indices, and coinsurance amounts are illustrative placeholders and must be replaced with current CMS SNF PPS final-rule values before operational use. This tool does not transmit claims and is not a substitute for a certified billing system or compliance review.
        </p>
      </main>
    </div>
  );
}

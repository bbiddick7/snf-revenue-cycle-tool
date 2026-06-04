# SNF Revenue Cycle Billing Tool

**A portfolio demonstration by [North Bridge Solutions](https://www.linkedin.com/) — Madison, Wisconsin**
*Fragmented Data → Leadership Success*

> ⚠️ **Demonstration only.** Every rate, case-mix index, and coinsurance amount in this tool is an **illustrative placeholder**. It does not transmit claims, does not validate eligibility, and is not a substitute for a certified billing system or compliance review.

---

## The problem

For skilled nursing facilities, revenue is rarely lost on the *rate* — it's lost in the gap between care delivered and dollars collected. Denied claims, missed qualifying-stay documentation, HIPPS/MDS mismatches, and untracked benefit-period exhaustion quietly erode margin. The data that would surface these leaks is fragmented across the MDS, the billing system, eligibility files, and the remittance advice.

This tool demonstrates how that fragmented picture can be pulled into a single decision-ready view for a business office manager, DON, or CFO.

## What it demonstrates

Four connected modules covering the core SNF Medicare Part A revenue cycle:

| Module | What it does |
|---|---|
| **PDPM Rate Calculator** | Builds the per-diem from all six case-mix components (PT, OT, SLP, NTA, Nursing, NCMO), applying wage index, case-mix group selection, and the variable per-diem adjustments (PT/OT taper after day 20, NTA 3× for days 1–3). |
| **Benefit Period & Coverage** | Splits a stay into full-coverage days (1–20), coinsurance days (21–100), and exhausted days (101+), estimating Medicare vs. beneficiary liability. |
| **Claim Tracker & Denials** | A/R dashboard — total billed, collected, open A/R, denied/RTP, collection rate — with per-claim status workflow and denial reason codes. |
| **Clean-Claim Checklist** | Pre-bill gating on the items that drive SNF denials: qualifying 3-day stay, 5-day MDS, HIPPS validity, certification, benefit-day verification, consolidated billing. |

## The insight it encodes

SNF revenue leakage is primarily a **clean-claim and denial-management problem**, not a rate problem. The tool is structured to make that visible: the rate calculator is one tab, but three of the four modules are about getting paid for the rate you already earned.

## Tech

React 18 + Vite. Single-component architecture, no backend, all state in-memory. Built to deploy as a static site.

## Running locally

```bash
npm install
npm run dev
```

## Building for production

```bash
npm run build      # outputs to /dist
npm run preview    # serve the production build locally
```

## Making it real

To move from demonstration to operational use, the placeholder tables at the top of `src/App.jsx` must be replaced with current CMS values:

- `PDPM_BASE` — the six component base rates (CMS SNF PPS final rule)
- `CMI` — case-mix index lookups (CMS PDPM case-mix tables)
- `PART_A_DAILY_COINS` — annual Medicare Part A SNF coinsurance amount
- Wage index — CBSA-specific, from CMS

These values change annually and must be verified against the current final rule.

---

© North Bridge Solutions. Demonstration artifact — not for operational billing use.

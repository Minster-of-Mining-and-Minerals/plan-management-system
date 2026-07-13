# Cashier Desk SOP (Implemented Policy)

This document turns operating recommendations into **product rules** that NovaCure now enforces or strongly guides.

Related overview: [`OUTPATIENT_WORKFLOW.md`](./OUTPATIENT_WORKFLOW.md)

---

## Phase A — Always send before cashiers can collect

### Policy
Patients appear in the cashier **Queue** only after clinical/reception staff click **Send to cashier** (billing card or workflow → Cashier desk).

### System behavior
| Action | Result |
|--------|--------|
| Charges added, not sent | Balance due exists, but **not** in cashier queue |
| Send to cashier | Collection request created; cashiers notified; visit enters queue |
| Collect payment | Allowed only if an **open** collection request exists |
| Fully paid | Leaves queue → **Paid today** / History |
| New charges after payment | Balance returns; visit does **not** re-enter queue until **sent again** |
| Balance grew after send | UI prompts **Send again (balance updated)** |

### Why
Creates an audit trail, notifies the desk, and prevents “random unpaid accounts” from appearing without an explicit clinical handoff.

---

## Phase B — Cashier desk operating model

### Tabs
| Tab | Use for |
|-----|---------|
| **Queue** | Active work — patients waiting to pay |
| **Paid today** | “Where did already-paid patients go?” + reprint |
| **History** | Older payment lookup |

### Session discipline
1. **Open session** at start of shift (required before Collect payment).
2. Use **Session summary** anytime during the shift (payments, methods, expected cash).
3. **Close session** after counting drawer cash; review variance. Closing also releases any patients you still hold.

### Multiple cashiers (Accept / Release)
All cashiers share one queue. To stop two people collecting on the same visit:

1. Select the visit in **Queue**.
2. Click **Accept** (holds ~10 minutes).
3. Collect payment (full or partial). The claim clears after payment.
4. Or click **Release** to return the patient to the shared queue without paying.
5. If a claim is abandoned, it expires after 10 minutes, or finance can **Force release**.

While held by someone else, Collect is blocked (HTTP 409).

### Partial payments
- Partial pay is first-class: same visit bill, remaining balance stays in queue.
- No second invoice per visit — one running account.
- After a partial, claim is released so any cashier can Accept again for the remainder.

---

## Phase C — Admin reconciliation & void discipline

### Daily collections (`/finance/collections`)
- Hospital-wide ledger across cashiers.
- Totals by method and by cashier.
- **Export CSV** for finance / end-of-day files.
- Prefer this page over asking each cashier for screenshots.

### Voids
- Requires `CASHIER_PAYMENT:VOID`.
- Reason required (≥ 5 characters).
- UI provides common reason presets.
- Voids are audited — use sparingly for true corrections only.

### Receipt templates (`/finance/receipt-templates`)
- Configure the default payment slip once; all cashier prints use it.

---

## Suggested daily checklist

### Clinical / reception
- [ ] Add billable services during the visit  
- [ ] Click **Send to cashier** when the patient should pay  
- [ ] If more services are added later, **send again**

### Cashier
- [ ] Open session + float  
- [ ] Work from **Queue** — **Accept** before Collect; **Release** returns to queue  
- [ ] Use **Paid today** for “already paid?” questions  
- [ ] Close session with counted cash  

### Admin / finance
- [ ] Review **Daily collections**  
- [ ] Export CSV if needed  
- [ ] Spot-check voids  
- [ ] Force-release stuck serving claims if needed  

---

## Quick decision tree

```
Patient ready to pay?
  → Has balance due?
       No  → Nothing to collect (Paid today / reprint if needed)
       Yes → Was Send to cashier done?
              No  → Clinical must Send to cashier
              Yes → Cashier Accepts → Collects (full or partial)
                     (or Release to return to queue)
```

---

*Aligned with Finance Phases 1–3 plus cashier policy phases A–C and multi-cashier Take claims.*

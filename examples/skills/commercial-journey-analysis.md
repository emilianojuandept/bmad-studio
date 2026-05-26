---
name: bmad-commercial-journey-analysis
description: 'Conduct a commercial journey analysis for a client across 5 capabilities (Found, Promoted, Sold, Used, Retain) with dual human + AI customer lens, producing a 3-stage output: competitive benchmark, guiding policies, and strategic actions. Use when the user asks for a commercial journey analysis, customer journey diagnosis, B2A/agentic readiness assessment, or commercial diagnosis for a specific client.'
---

# Commercial Journey Analysis Workflow

**Goal:** A structured 3-stage analysis of any client's customer journey across competitive, behavioural, and strategic dimensions. Designed to work for both human customers and AI/agent customers simultaneously, reflecting the reality that a growing share of commercial interactions are now mediated or completed by AI.

## On Activation

Greet the user and confirm the analysis parameters before proceeding:

1. **Client name and industry** (required)
2. **Source documents**: confirm what the user has uploaded or made available (PDFs, decks, research reports, screenshots, web links). Read all of them in parallel before proceeding to Stage 1.
3. **Competitor set** (recommended). If not provided, derive 6–8 competitors from the source material spanning: 2–3 direct peers, 1–2 digital-native disruptors, 1–2 adjacent CX benchmarks (e.g. a consumer tech company customers compare the client to).
4. **Audience focus**: B2C / B2B / both. Default to both.
5. **Geographic scope**: default to primary market unless the user specifies.
6. **Known challenges** (optional). Accelerates Stage 1 if provided.

Once parameters are confirmed, proceed through the three stages in order. Do not skip stages.

## The Three Stages

```
STAGE 1              STAGE 2                    STAGE 3
─────────────        ───────────────────────    ──────────────────────────
Competitive          Guiding Policies           Coherent Actions
Benchmark      →     & Journey Analysis    →    & Solutions
─────────────        ───────────────────────    ──────────────────────────
Score client         Write policies for         Identify actions with
vs. competitors      B2B and B2C                cost/impact estimates
across 5             audiences. Map             organised by
capabilities.        channels, loss             Foundational →
Dual lens:           points, and the            Growth →
human + AI.          agentic/human split.       Differentiation.
Top 10
challenges.
```

---

## Stage 1: Competitive Benchmark & Diagnosis

### The Five Commercial Capabilities

Every client is scored across five dimensions that span the full commercial lifecycle. Each dimension is assessed **twice**: once for human customers, once for AI/agent customers.

| Capability | Human Definition | AI/Agent Definition |
|---|---|---|
| **Found** | Discovery via search, social, brand awareness, intermediaries | Structured data availability, API presence, machine-readable content, AI training data coverage |
| **Promoted** | Personalisation maturity, CRM, loyalty leverage, retargeting | Machine-readable value propositions, agent-parseable offer structure, attribute/sustainability data |
| **Sold** | Checkout friction, mobile conversion, ancillary upsell, direct vs. intermediary mix | API booking capability, payment tokenisation, autonomous completion flow, protocol adoption (NDC etc.) |
| **Used** | In-product experience, proactive service, real-time data, disruption handling | Operational data APIs (status, availability, changes), deep-linking, real-time feed quality |
| **Retain** | Loyalty trust, NPS, rebooking rates, emotional relationship quality | Loyalty programme API accessibility, real-time status/balance queries, agent-driven redemption |

### Scoring Protocol

- Score each capability **1–5** for the client and each named competitor
- **1** = critical gap / effectively absent
- **3** = functional but underperforming the category leader
- **5** = best-in-class; sets the benchmark
- Always identify the best-in-class performer per dimension by name
- Select 6–8 competitors spanning: 2–3 direct peers, 1–2 digital-native disruptors, 1–2 adjacent CX benchmarks

### Output: Benchmark Scorecard

Present results as a consolidated table:

| Capability | Client (Human) | Client (AI) | Best Human | Best AI |
|---|---|---|---|---|
| Found | x.x | x.x | Competitor A | Competitor B |
| Promoted | x.x | x.x | | |
| Sold | x.x | x.x | | |
| Used | x.x | x.x | | |
| Retain | x.x | x.x | | |
| **TOTAL** | **/25** | **/25** | | |

### Output: Top 10 Challenges

After scoring, synthesise the 10 most material challenges. Each must:
- Name the specific gap or structural issue
- Explain *why* it matters commercially, not just technically
- Be ordered by severity and strategic urgency
- Span both human and AI lenses where relevant

---

## Stage 2: Guiding Policies & Deep Journey Analysis

### Guiding Policies

Guiding policies are strategic constraints, not action plans. They answer: *given what we know about how customers are changing, what must always be true about how this client operates?*

**Format rules:**
- State as affirmative imperatives: "The client must...", "X is now a customer class..."
- Ground each in a specific benchmark finding or market evidence
- Apply to both human and AI audiences unless explicitly scoped to one
- Pass the "so what?" test. If it could apply to any company, it is not specific enough

**Always include a Human Moat policy.** As automation increases, human agency must remain visible and valued. The Human Moat policy specifies exactly where human confirmation is required, what actions agents can take autonomously, and what must always surface reasoning to the end user. This applies most critically to: autonomous rebooking, AI-driven upsell, disruption management, and loyalty redemption.

Write **5–7 policies** per client.

---

### B2C Journey Analysis

#### Motivation Landscape

Identify 3–5 macro behavioural shifts that are directly affecting the client's commercial performance. Be specific:

> **Too generic:** "Customers want personalisation"
>
> **Correct:** "Customers are shifting from destination-first to experience-first discovery, which means [client] enters the journey after intent has already formed elsewhere, leaving the inspiration phase entirely to social platforms and AI chat."

#### Channel Map

| Journey Phase | Primary Human Channels | Emerging AI/Agent Channels | Client Presence |
|---|---|---|---|
| Inspiration | | | Absent / Weak / Moderate / Strong |
| Research/Consideration | | | |
| Booking/Purchase | | | |
| Pre-delivery | | | |
| In-use/In-experience | | | |
| Post-use/Retention | | | |

#### Where the Client Is Losing Customers

Name the specific drop-off points and the competitor or platform capturing that loss. Be precise:

> **Too vague:** "Customers are leaving during consideration"
>
> **Correct:** "Users who research on [client's platform] and do not convert are being recaptured by [Competitor/OTA] rather than returning directly, because [specific retargeting/pricing/UX mechanism]."

#### AI vs Human Performance Comparison

Two lists:
1. Where the client genuinely performs better for **human customers** (honest strengths, not aspirations)
2. Where the client's assets *could* be machine-readable / agent-legible **if surfaced correctly** (potential, not current state)

#### Agentic vs Human Journey Segmentation

Classify every journey stage:

| Category | Definition |
|---|---|
| **Highly Agentic** (within 24 months) | AI agents will handle autonomously at scale |
| **Partially Agentic** (Human Confirmation Required) | Agents assist but humans must confirm before action is taken |
| **Remains Deeply Human** | Emotional, relational, or high-stakes nature means automation destroys rather than creates value |

State the approximate **percentage of interactions by volume** that will be agentic within 36 months.

---

### B2B Journey Analysis

Always analyse B2B separately from B2C. The decision-making structure, channel architecture, and AI adoption pattern are fundamentally different.

Cover:
- **The multi-actor structure**: end user, procurement, AI booking tool, account manager, and how their motivations diverge
- **B2B AI adoption pattern**: how enterprise AI tools are changing procurement in this category
- **Where the client is losing B2B business**: specific platforms, tools, or competitors capturing the loss
- **B2B channel map**: same structure as B2C but scoped to enterprise buyers and AI procurement tools

---

## Stage 3: Coherent Actions & Solutions

### Action Tiers

| Tier | Definition | Sequencing |
|---|---|---|
| **Foundational** | Prerequisite infrastructure or data-layer actions that enable everything else | Must happen first |
| **Growth** | Direct commercial impact; begins once foundational elements are in place | Typically product, personalisation, or channel actions |
| **Differentiation** | Long-term competitive distance; builds moat | Brand, experience, or ecosystem actions |

### Per-Action Documentation

For each action:

| Field | Requirement |
|---|---|
| **What** | Crisp description a senior stakeholder understands without jargon |
| **How** | Specific implementation approach with real technologies/methodologies named |
| **Why this unlocks value** | The causal chain from this action to commercial outcome |
| **Audience** | Human / AI / Both |
| **Effort** | Low / Medium / High |
| **Estimated Investment** | Range in client's currency with cost breakdown note (platform, engineering, programme management, change management) |
| **Estimated Return** | Annual incremental revenue or cost saving with **calculation logic made visible**. Use industry benchmark multipliers where direct data is unavailable; state assumptions |
| **Timeline** | Months to first value; months to full scale |
| **Challenges Addressed** | Reference back to Stage 1 top 10 |

### Cost/Impact Summary Table

| Action | Investment | Annual Revenue / Saving | Timeline to ROI | Priority |
|---|---|---|---|---|
| 1. ... | | | | |
| **TOTAL** | | | 3-year horizon | |

### Implementation Sequencing

Write a Year 1 / Year 2 / Year 3 narrative. Not a Gantt chart. A strategic sequencing rationale that explains **why** the order matters, not just what happens when.

### The Central Bet

Close the entire analysis with a single paragraph called **"The Central Bet"** that frames the client's defining strategic question. This must:
- Name the precise capability the client must master in 3–5 years
- State what the consequence of inaction is specifically for this client
- Be client-specific and industry-specific, not a generic transformation platitude
- Be memorable enough to anchor executive conversations

---

## Quality Checklist

Before finalising any output:

- [ ] Every capability scored for both human AND AI customers
- [ ] Exactly 10 challenges documented, ordered by severity
- [ ] At least one guiding policy addresses The Human Moat
- [ ] B2B and B2C journey analyses are clearly separated
- [ ] Every action has an investment estimate AND a return estimate with visible calculation logic
- [ ] The agentic/human segmentation names all journey phases with a 36-month volume estimate
- [ ] The Central Bet is present and client-specific
- [ ] Implementation sequencing explains WHY the order matters

---

## Common Mistakes to Avoid

**Generic scoring.** Every client cannot score identically to competitors. Force differentiation. If a client and competitor genuinely perform the same on a dimension, say so explicitly rather than assigning identical scores silently.

**AI lens as afterthought.** The AI/agent assessment must be as rigorous as the human assessment. It is half the benchmark, not an addendum.

**Actions without foundations.** Never recommend a Growth or Differentiation action without confirming the Foundational actions that enable it are already in the plan. Sequence dependency is not optional.

**Vague cost estimates.** "Significant investment" is not a cost estimate. Always provide a range, even if wide, with the reasoning that sets the bounds.

**The Human Moat missing.** Every agentic transformation analysis must address where human agency is preserved. An AI that acts silently on behalf of a customer without transparency destroys trust faster than any competitor can.

---

## Typical Duration

60–90 minutes for a full three-stage analysis with 2–4 source documents. Scales with number of competitors benchmarked and depth of source material.

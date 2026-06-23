import { NextRequest, NextResponse } from "next/server";

function getMockResponse(systemPrompt: string, userMessage: string): string {
  const prompt = systemPrompt.toLowerCase();

  if (prompt.includes("router") || prompt.includes("classify")) {
    return JSON.stringify(
      {
        tasks: [
          {
            id: "task-1",
            summary: "Update checkout flow to support Apple Pay",
            bucket: "product",
            reasoning:
              "Directly relates to customer-facing payment feature — product team owns payment integrations.",
          },
          {
            id: "task-2",
            summary: "Fix null pointer exception in order service on empty cart",
            bucket: "engineering",
            reasoning:
              "Runtime bug in backend service requiring a code fix and regression test.",
          },
          {
            id: "task-3",
            summary: "Ensure PCI-DSS compliance for stored card tokens",
            bucket: "compliance",
            reasoning:
              "Involves regulatory requirements around payment data storage — compliance review needed.",
          },
        ],
      },
      null,
      2
    );
  }

  if (prompt.includes("script") || prompt.includes("prompt")) {
    return `VOICE AGENT SCRIPT — DRAFT
========================

[GREETING]
Agent: "Hi, thanks for calling. My name is Alex. How can I help you today?"

[INTENT CAPTURE]
Agent: "Got it. Just to make sure I understand — you're reaching out about {{customer_issue}}. Is that right?"

[RESOLUTION FLOW]
Agent: "I can help with that. Let me pull up your account. While I do that, can you confirm the email address on file?"

[HOLD]
Agent: "I'm just going to place you on a brief hold — no more than two minutes. Is that okay?"

[RESOLUTION]
Agent: "Thanks for your patience. I've gone ahead and {{resolution_action}}. You should see that reflected within 24 hours."

[CLOSE]
Agent: "Is there anything else I can help you with today?"
Customer: [responds]
Agent: "Perfect. Thanks so much for calling — have a great rest of your day."

[END CALL]`;
  }

  if (prompt.includes("ticket")) {
    return `ENGINEERING TICKET — DRAFT
==========================

Title: Implement rate limiting on /api/claude route

Priority: Medium
Estimate: 3 points
Assignee: TBD

Description:
The /api/claude POST endpoint currently has no per-user or per-IP rate limiting. Under load or abuse this could result in unexpected API cost or degraded service for other users.

Acceptance Criteria:
- [ ] Rate limit enforced at 20 requests/minute per authenticated user
- [ ] Returns HTTP 429 with Retry-After header when limit exceeded
- [ ] Limit is configurable via environment variable
- [ ] Rate limit state stored in Redis (existing instance)
- [ ] Unit tests cover limit enforcement and header correctness

Out of Scope:
- Adjusting limits per user tier (follow-up ticket)
- Admin bypass (follow-up ticket)

Dependencies:
- Redis client already available via src/lib/redis.ts`;
  }

  if (prompt.includes("compliance")) {
    return `⚠️  DRAFT - REQUIRES HUMAN REVIEW  ⚠️
======================================

COMPLIANCE ASSESSMENT — AI-ASSISTED DRAFT

Subject: Use of AI-generated content in customer-facing communications

Prepared by: AI Assistant (automated draft)
Date: ${new Date().toISOString().split("T")[0]}
Status: DRAFT — Not approved for distribution

---

1. SCOPE
This draft covers the use of AI-generated responses in customer support channels as described in the provided context.

2. APPLICABLE REGULATIONS
- GDPR Article 22 — Automated individual decision-making
- CCPA Section 1798.185 — Automated decision requirements
- FTC Guidelines on AI disclosures (2024)

3. IDENTIFIED RISK AREAS
- Customer consent: Users must be informed when interacting with an AI agent.
- Data retention: Conversation logs containing PII require defined retention limits.
- Human escalation: A clear path to a human agent must be available at all times.
- Audit trail: All AI-generated outputs must be logged for review purposes.

4. RECOMMENDED CONTROLS
- Add AI disclosure to session initiation flow
- Implement 90-day log retention with encrypted storage
- Define escalation trigger conditions in agent script
- Assign a compliance owner for quarterly AI output audits

---

⚠️  THIS DOCUMENT IS AN AI-GENERATED DRAFT.
It does not constitute legal advice. A qualified compliance officer or legal counsel must review and approve before use.`;
  }

  // fallback
  return `Mock response for: "${userMessage.slice(0, 80)}${userMessage.length > 80 ? "…" : ""}"

This is a placeholder response from the mock route handler. To match a specific template, include one of the following keywords in the system prompt:
- "router" or "classify" → task routing JSON
- "script" or "prompt" → voice agent script
- "ticket" → engineering ticket
- "compliance" → compliance draft`;
}

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userMessage } = await request.json();
    const result = getMockResponse(systemPrompt ?? "", userMessage ?? "");
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

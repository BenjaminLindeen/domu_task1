"use client";

import { useState } from "react";
import { parseSRT } from "@/lib/parseSRT";

const tasks = [
  {
    id: "script",
    label: "Script → Agent Prompt",
    inputLabel: "Call transcript or scenario",
    placeholder:
      "Paste a call transcript or describe the voicebot scenario to convert into an agent prompt...",
    systemPrompt: `You are an expert conversational AI designer specializing in voicebot and IVR scripts.
Your job is to take call transcripts or scenario descriptions and convert them into clean, structured agent prompts suitable for a voice AI system.
Output a well-organized agent prompt with clearly labeled sections: [GREETING], [INTENT CAPTURE], [RESOLUTION FLOW], [HOLD], [RESOLUTION], and [CLOSE].
Use {{placeholder}} syntax for dynamic values. Be concise, natural-sounding, and professional.
Always include a clear escalation path to a human agent.`,
  },
  {
    id: "ticket",
    label: "Engineering Ticket",
    inputLabel: "Issue description",
    placeholder:
      "Describe the bug, feature request, or technical issue to convert into a structured ticket...",
    systemPrompt: `You are a senior software engineering lead who writes precise, actionable engineering tickets.
Convert the provided issue description into a structured engineering ticket with the following sections:
- Title (concise, action-oriented)
- Priority (Critical/High/Medium/Low) with brief justification
- Estimate (story points: 1, 2, 3, 5, 8, 13)
- Description (clear problem statement)
- Acceptance Criteria (bulleted checklist, measurable outcomes)
- Out of Scope (what this ticket explicitly does NOT cover)
- Dependencies (any blockers or related systems)
Be specific, avoid vague language, and write acceptance criteria a developer can test against.`,
  },
  {
    id: "compliance",
    label: "Compliance Draft",
    inputLabel: "Compliance requirement or policy area",
    placeholder:
      "Describe the compliance requirement, regulation, or policy area to draft guidance for...",
    systemPrompt: `You are a compliance analyst drafting internal policy guidance documents.
Convert the provided compliance requirement or policy area into a structured compliance draft with the following sections:
1. SCOPE
2. APPLICABLE REGULATIONS (cite specific articles/sections where possible)
3. IDENTIFIED RISK AREAS
4. RECOMMENDED CONTROLS
Always include a prominent disclaimer that this is an AI-generated draft requiring review by a qualified compliance officer or legal counsel before use.
Be thorough but practical — focus on actionable controls, not just theoretical risks.`,
  },
  {
    id: "flag",
    label: "Flag Call Review",
    inputLabel: "Call transcript",
    placeholder:
      "Paste the call transcript to review for quality and compliance flags...",
    systemPrompt: `You are a quality assurance analyst reviewing call center transcripts for compliance and quality issues.
Analyze the provided call transcript and produce a structured review with the following sections:
- OVERALL SCORE (1-10 with brief rationale)
- COMPLIANCE FLAGS (any regulatory, legal, or policy violations — cite specific issues)
- QUALITY FLAGS (tone, professionalism, accuracy, resolution effectiveness)
- POSITIVE OBSERVATIONS (what was done well)
- RECOMMENDED ACTIONS (specific coaching points or escalation recommendations)
Be objective, cite specific transcript excerpts when flagging issues, and distinguish between critical compliance failures and quality improvement opportunities.`,
  },
];

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [activeTask, setActiveTask] = useState(tasks[0].id);
  const [userMessage, setUserMessage] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const task = tasks.find((t) => t.id === activeTask)!;
  const hasKey = apiKey.trim().length > 0;

  function handleTaskSwitch(id: string) {
    setActiveTask(id);
    setUserMessage("");
    setOutput(null);
    setError(null);
    setFilePreview(null);
  }

  async function handleRun() {
    if (!hasKey) return;
    setLoading(true);
    setOutput(null);
    setError(null);

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model,
          systemPrompt: task.systemPrompt,
          userMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Request failed");
      } else {
        setOutput(data.result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-8 space-y-5">

      {/* API key + model selector row */}
      <div className="flex gap-3 items-top">
        <div className="flex-[3] space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="h-10 w-full bg-[#0d1117] border border-slate-800 rounded px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
          />
          <p className="text-xs text-slate-600 mt-6">Key is never stored or logged</p>
        </div>
        <div className="flex-[2] space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-10 w-full bg-[#0d1117] border border-slate-800 rounded px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600 transition-colors cursor-pointer"
          >
            <option value="claude-sonnet-4-6">Sonnet 4.6 — Recommended</option>
            <option value="claude-opus-4-8">Opus 4.8 — Slower, smarter</option>
            <option value="claude-haiku-4-5">Haiku 4.5 — Fast, cheap</option>
          </select>
        </div>
      </div>

      {/* Task selector */}
      <div className="flex flex-wrap gap-2">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTaskSwitch(t.id)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              activeTask === t.id
                ? "bg-slate-700 text-white border-slate-500"
                : "bg-transparent text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-lg p-6 space-y-5">

        {/* Textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            {task.inputLabel}
          </label>
          <textarea
            key={task.id}
            rows={10}
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder={task.placeholder}
            className="w-full bg-[#0d1117] border border-slate-800 rounded px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-slate-600 transition-colors"
          />
        </div>

        {/* File upload */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            Attachment{" "}
            <span className="text-slate-600 normal-case tracking-normal font-normal">
              — optional .txt or .srt
            </span>
          </label>
          <label className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#0d1117] border border-dashed border-slate-800 rounded cursor-pointer hover:border-slate-600 hover:text-slate-300 transition-colors group">
            <svg
              className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
              Choose file
            </span>
            <input
              type="file"
              accept=".txt,.srt"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const raw = String(ev.target?.result ?? "");
                  const cleaned = parseSRT(raw);
                  setUserMessage((prev) =>
                    prev ? prev + "\n\n" + cleaned : cleaned
                  );
                  const previewLines = cleaned
                    .split("\n")
                    .filter((l) => l.trim())
                    .slice(0, 3);
                  setFilePreview(previewLines.join("\n"));
                };
                reader.readAsText(file);
              }}
            />
          </label>
          {filePreview && (
            <div className="mt-1 px-3 py-2 bg-[#0d1117] border border-slate-800 rounded text-xs text-slate-500 font-mono leading-relaxed">
              <span className="text-slate-600 not-italic">Preview: </span>
              {filePreview.split("\n").map((line, i) => (
                <span key={i} className="block truncate">{line}</span>
              ))}
            </div>
          )}
        </div>

        {/* Run */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleRun}
            disabled={!hasKey || loading}
            className={`px-6 py-2 text-sm rounded border transition-colors ${
              hasKey && !loading
                ? "bg-slate-700 text-white border-slate-500 hover:bg-slate-600 cursor-pointer"
                : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
            }`}
          >
            {loading ? "Running…" : hasKey ? "Run" : "Enter API key to run"}
          </button>
        </div>
      </div>

      {/* Output panel */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-lg overflow-hidden">

        {/* DRAFT banner — shown when output exists */}
        {output && (
          <div className="px-5 py-3 bg-red-950/50 border-b border-red-900/40">
            <span className="text-red-400 text-xs font-semibold tracking-widest uppercase">
              DRAFT — Requires Human Review
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-5 py-3 bg-red-950/30 border-b border-red-900/30">
            <span className="text-red-400 text-xs">{error}</span>
          </div>
        )}

        {/* Content */}
        {output ? (
          <pre className="px-6 py-5 text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
            {output}
          </pre>
        ) : (
          <div className="flex items-center justify-center min-h-52 px-6">
            <p className="text-slate-700 text-sm">Output will appear here</p>
          </div>
        )}
      </div>

    </div>
  );
}

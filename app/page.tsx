"use client";

import {useState} from "react";
import ReactMarkdown from "react-markdown";
import {parseSRT} from "@/lib/parseSRT";

const tasks = [
    {
        id: "script",
        label: "Script → Agent Prompt",
        inputLabel: "Call transcript or scenario",
        placeholder:
            "Paste a call transcript or describe the voicebot scenario to convert into an agent prompt...",
        fileSlug: "agent-prompt",
        systemPrompt: `You are an expert conversational AI designer specializing in voicebot and IVR scripts.
Your job is to take call transcripts or scenario descriptions and convert them into clean, structured agent prompts suitable for a voice AI system.
Always respond in clean markdown format using:
- # for the main title
- ## for each section header
- **bold** for labels and key terms
- Horizontal rules (---) between major sections
- Proper blank lines between sections for readability
Output a well-organized agent prompt with clearly labeled sections: GREETING, INTENT CAPTURE, RESOLUTION FLOW, HOLD, RESOLUTION, and CLOSE.
Use {{placeholder}} syntax for dynamic values. Be concise, natural-sounding, and professional.
Always include a clear escalation path to a human agent.`,
    },
    {
        id: "ticket",
        label: "Engineering Ticket",
        inputLabel: "Issue description",
        placeholder:
            "Describe the bug, feature request, or technical issue to convert into a structured ticket...",
        fileSlug: "engineering-ticket",
        systemPrompt: `You are a senior software engineering lead who writes precise, actionable engineering tickets.
Always respond in clean markdown format using:
- # for the ticket title
- ## for each section header
- **bold** for labels and field names
- Horizontal rules (---) between major sections
- Proper blank lines between sections for readability
Convert the provided issue description into a structured engineering ticket with the following sections:
Title, Priority, Estimate, Description, Acceptance Criteria, Out of Scope, Dependencies.
Be specific, avoid vague language, and write acceptance criteria a developer can test against.`,
    },
    {
        id: "compliance",
        label: "Compliance Draft",
        inputLabel: "Compliance requirement or policy area",
        placeholder:
            "Describe the compliance requirement, regulation, or policy area to draft guidance for...",
        fileSlug: "compliance-draft",
        systemPrompt: `You are a compliance analyst drafting internal policy guidance documents.
Always respond in clean markdown format using:
- # for the main document title
- ## for each section header
- **bold** for labels and key terms
- Horizontal rules (---) between major sections
- Proper blank lines between sections for readability
Convert the provided compliance requirement or policy area into a structured compliance draft with the following sections:
Scope, Applicable Regulations, Identified Risk Areas, Recommended Controls.
Always include a prominent disclaimer that this is an AI-generated draft requiring review by a qualified compliance officer or legal counsel before use.
Be thorough but practical — focus on actionable controls, not just theoretical risks.`,
    },
    {
        id: "flag",
        label: "Flag Call Review",
        inputLabel: "Call transcript",
        placeholder:
            "Paste the call transcript to review for quality and compliance flags...",
        fileSlug: "flag-call-review",
        systemPrompt: `You are a quality assurance analyst reviewing call center transcripts for compliance and quality issues.
Always respond in clean markdown format using:
- # for the main review title
- ## for each section header
- **bold** for labels and key terms
- Horizontal rules (---) between major sections
- Proper blank lines between sections for readability
Analyze the provided call transcript and produce a structured review with the following sections:
Overall Score, Compliance Flags, Quality Flags, Positive Observations, Recommended Actions.
Be objective, cite specific transcript excerpts when flagging issues, and distinguish between critical compliance failures and quality improvement opportunities.`,
    },
];

type TabState = {
    userMessage: string;
    output: string | null;
    error: string | null;
    filePreview: string | null;
};

const blankTab = (): TabState => ({
    userMessage: "",
    output: null,
    error: null,
    filePreview: null,
});

export default function Home() {
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("claude-sonnet-4-6");
    const [activeTask, setActiveTask] = useState(tasks[0].id);
    const [loading, setLoading] = useState(false);
    const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
    const [tabStates, setTabStates] = useState<Record<string, TabState>>(
        Object.fromEntries(tasks.map((t) => [t.id, blankTab()]))
    );

    const task = tasks.find((t) => t.id === activeTask)!;
    const tab = tabStates[activeTask];
    const hasKey = apiKey.trim().length > 0;

    function updateTab(patch: Partial<TabState>) {
        setTabStates((prev) => ({
            ...prev,
            [activeTask]: {...prev[activeTask], ...patch},
        }));
    }

    function handleTaskSwitch(id: string) {
        setActiveTask(id);
        setShowOverwritePrompt(false);
    }

    function downloadOutput(taskId: string, content: string) {
        const slug = tasks.find((t) => t.id === taskId)?.fileSlug ?? taskId;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        const blob = new Blob([content], {type: "text/markdown"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}-${timestamp}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function executeRun() {
        setShowOverwritePrompt(false);
        setLoading(true);
        updateTab({output: null, error: null});

        try {
            const res = await fetch("/api/claude", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    apiKey,
                    model,
                    systemPrompt: task.systemPrompt,
                    userMessage: tab.userMessage,
                }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                updateTab({error: data.error ?? "Request failed"});
            } else {
                updateTab({output: data.result});
            }
        } catch (e) {
            updateTab({error: e instanceof Error ? e.message : "Network error"});
        } finally {
            setLoading(false);
        }
    }

    function handleRun() {
        if (!hasKey || loading) return;
        if (tab.output) {
            setShowOverwritePrompt(true);
            return;
        }
        executeRun();
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
                    <p className="text-xs text-slate-600">Key is never stored or logged</p>
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
                        value={tab.userMessage}
                        onChange={(e) => updateTab({userMessage: e.target.value})}
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
                    <label
                        className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#0d1117] border border-dashed border-slate-800 rounded cursor-pointer hover:border-slate-600 hover:text-slate-300 transition-colors group">
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
                                    const previewLines = cleaned
                                        .split("\n")
                                        .filter((l) => l.trim())
                                        .slice(0, 3);
                                    updateTab({
                                        userMessage: tab.userMessage ? tab.userMessage + "\n\n" + cleaned : cleaned,
                                        filePreview: previewLines.join("\n"),
                                    });
                                };
                                reader.readAsText(file);
                            }}
                        />
                    </label>
                    {tab.filePreview && (
                        <div
                            className="mt-1 px-3 py-2 bg-[#0d1117] border border-slate-800 rounded text-xs text-slate-500 font-mono leading-relaxed">
                            <span className="text-slate-600 not-italic">Preview: </span>
                            {tab.filePreview.split("\n").map((line, i) => (
                                <span key={i} className="block truncate">{line}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Run / overwrite prompt */}
                <div className="flex flex-col items-end gap-3 pt-1">
                    {showOverwritePrompt && (
                        <div
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-amber-950/40 border border-amber-800/40 rounded text-xs text-amber-300">
                            <span>You have existing output. Download it before replacing?</span>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => {
                                        downloadOutput(activeTask, tab.output!);
                                        executeRun();
                                    }}
                                    className="px-3 py-1.5 rounded border border-amber-700 bg-amber-900/40 hover:bg-amber-800/50 text-amber-200 transition-colors"
                                >
                                    Download &amp; Continue
                                </button>
                                <button
                                    onClick={() => executeRun()}
                                    className="px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                >
                                    Discard &amp; Continue
                                </button>
                            </div>
                        </div>
                    )}
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

                {/* DRAFT banner + download button */}
                {tab.output && (
                    <div
                        className="px-5 py-3 bg-red-950/50 border-b border-red-900/40 flex items-center justify-between">
            <span className="text-red-400 text-xs font-semibold tracking-widest uppercase">
              DRAFT — Requires Human Review
            </span>
                        <button
                            onClick={() => downloadOutput(activeTask, tab.output!)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-400 border border-slate-700 rounded hover:text-slate-200 hover:border-slate-500 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Download .md
                        </button>
                    </div>
                )}

                {/* Error */}
                {tab.error && (
                    <div className="px-5 py-3 bg-red-950/30 border-b border-red-900/30">
                        <span className="text-red-400 text-xs">{tab.error}</span>
                    </div>
                )}

                {/* Content */}
                {tab.output ? (
                    <div className="px-6 py-5">
                        <ReactMarkdown
                            components={{
                                h1: ({children}) => (
                                    <h1 className="text-xl font-bold text-slate-100 mb-4 mt-1">{children}</h1>
                                ),
                                h2: ({children}) => (
                                    <h2 className="text-base font-semibold text-slate-200 mb-2 mt-5 pb-1 border-b border-slate-700">{children}</h2>
                                ),
                                h3: ({children}) => (
                                    <h3 className="text-sm font-semibold text-slate-300 mb-1.5 mt-4">{children}</h3>
                                ),
                                p: ({children}) => (
                                    <p className="text-sm text-slate-300 leading-relaxed mb-3">{children}</p>
                                ),
                                strong: ({children}) => (
                                    <strong className="font-semibold text-slate-100">{children}</strong>
                                ),
                                ul: ({children}) => (
                                    <ul className="list-disc list-inside text-sm text-slate-300 leading-relaxed mb-3 space-y-1 pl-2">{children}</ul>
                                ),
                                ol: ({children}) => (
                                    <ol className="list-decimal list-inside text-sm text-slate-300 leading-relaxed mb-3 space-y-1 pl-2">{children}</ol>
                                ),
                                li: ({children}) => (
                                    <li className="text-slate-300">{children}</li>
                                ),
                                hr: () => (
                                    <hr className="border-slate-700 my-5"/>
                                ),
                                code: ({children}) => (
                                    <code
                                        className="bg-slate-800 text-slate-300 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                                ),
                            }}
                        >
                            {tab.output}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="flex items-center justify-center min-h-52 px-6">
                        <p className="text-slate-700 text-sm">Output will appear here</p>
                    </div>
                )}
            </div>

        </div>
    );
}

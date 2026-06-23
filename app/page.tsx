"use client";

import { useState } from "react";

const tasks = [
  {
    id: "script",
    label: "Script → Agent Prompt",
    inputLabel: "Call transcript or scenario",
    placeholder:
      "Paste a call transcript or describe the voicebot scenario to convert into an agent prompt...",
  },
  {
    id: "ticket",
    label: "Engineering Ticket",
    inputLabel: "Issue description",
    placeholder:
      "Describe the bug, feature request, or technical issue to convert into a structured ticket...",
  },
  {
    id: "compliance",
    label: "Compliance Draft",
    inputLabel: "Compliance requirement or policy area",
    placeholder:
      "Describe the compliance requirement, regulation, or policy area to draft guidance for...",
  },
  {
    id: "flag",
    label: "Flag Call Review",
    inputLabel: "Call transcript",
    placeholder:
      "Paste the call transcript to review for quality and compliance flags...",
  },
];

export default function Home() {
  const [activeTask, setActiveTask] = useState(tasks[0].id);
  const task = tasks.find((t) => t.id === activeTask)!;

  return (
    <div className="max-w-3xl mx-auto px-8 py-8 space-y-5">

      {/* Task selector */}
      <div className="flex flex-wrap gap-2">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTask(t.id)}
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
            placeholder={task.placeholder}
            className="w-full bg-[#0d1117] border border-slate-800 rounded px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-slate-600 transition-colors"
          />
        </div>

        {/* File upload */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            Attachment{" "}
            <span className="text-slate-600 normal-case tracking-normal font-normal">
              — optional .txt
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
            <input type="file" accept=".txt" className="sr-only" />
          </label>
        </div>

        {/* Run */}
        <div className="flex justify-end pt-1">
          <button
            disabled
            className="px-6 py-2 text-sm rounded bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
          >
            Run
          </button>
        </div>
      </div>

      {/* Output panel */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-lg overflow-hidden">

        {/* DRAFT banner — hidden until output exists */}
        <div className="hidden px-5 py-3 bg-red-950/50 border-b border-red-900/40">
          <span className="text-red-400 text-xs font-semibold tracking-widest uppercase">
            DRAFT — Requires Human Review
          </span>
        </div>

        {/* Placeholder */}
        <div className="flex items-center justify-center min-h-52 px-6">
          <p className="text-slate-700 text-sm">Output will appear here</p>
        </div>
      </div>

    </div>
  );
}

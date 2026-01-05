import React from "react";

export function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-soft border border-zinc-200 ${props.className ?? ""}`}>
      {props.children}
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const v = props.variant ?? "primary";
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition";
  const cls =
    v === "primary"
      ? `${base} bg-zinc-900 text-white hover:bg-zinc-800`
      : `${base} bg-transparent text-zinc-700 hover:bg-zinc-100 border border-zinc-200`;
  return <button {...props} className={`${cls} ${props.className ?? ""}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200 ${props.className ?? ""}`}
    />
  );
}

export function Label(props: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-zinc-600">{props.children}</div>;
}

export function Hint(props: { children: React.ReactNode }) {
  return <div className="text-xs text-zinc-500">{props.children}</div>;
}

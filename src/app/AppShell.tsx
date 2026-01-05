import React from "react";

export function Card(props: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={[
                "group relative overflow-hidden rounded-2xl",
                "bg-white/70 backdrop-blur",
                "border border-black/10",
                "shadow-soft",
                "transition-shadow duration-200",
                props.className ?? "",
            ].join(" ")}
        >
            {/* subtle premium sheen (lighter + reacts on hover) */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.28] transition-opacity duration-200 group-hover:opacity-[0.40]">
                <div className="absolute -top-24 left-1/4 h-48 w-96 rotate-12 bg-gradient-to-r from-white/0 via-white/45 to-white/0 blur-2xl" />
            </div>

            {/* inner hairline highlight for "glass" */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/50" />

            <div className="relative">{props.children}</div>
        </div>
    );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
    const v = props.variant ?? "primary";

    const base =
        "relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 " +
        "active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";

    const primary =
        base +
        " text-white " +
        "bg-[linear-gradient(135deg,var(--accent),var(--accent2))] " +
        "shadow-[0_14px_40px_rgba(17,24,39,0.18)] " +
        "border border-black/10 " +
        "hover:brightness-[1.04] hover:shadow-[0_18px_55px_rgba(17,24,39,0.20)]";

    const ghost =
        base +
        " text-zinc-800 bg-white/40 hover:bg-white/70 border border-black/10 " +
        "hover:shadow-[0_10px_30px_rgba(17,24,39,0.08)]";

    return <button {...props} className={`${v === "primary" ? primary : ghost} ${props.className ?? ""}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                "w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm",
                "outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-black/10",
                "placeholder:text-zinc-400",
                props.className ?? "",
            ].join(" ")}
        />
    );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={[
                "w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm",
                "outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-black/10",
                "placeholder:text-zinc-400",
                props.className ?? "",
            ].join(" ")}
        />
    );
}

export function Label(props: { children: React.ReactNode }) {
    return <div className="text-xs font-semibold text-zinc-600">{props.children}</div>;
}

export function Hint(props: { children: React.ReactNode }) {
    return <div className="text-xs text-zinc-500">{props.children}</div>;
}

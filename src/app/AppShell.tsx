import React from "react";

export function Card(props: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={[
                "relative overflow-hidden rounded-2xl",
                "bg-white/70 backdrop-blur",
                "border border-black/10",
                "shadow-soft",
                props.className ?? "",
            ].join(" ")}
        >
            {/* FE: subtle highlight sheen */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
                <div className="absolute -top-24 left-1/4 h-48 w-96 rotate-12 bg-gradient-to-r from-white/0 via-white/40 to-white/0 blur-2xl" />
            </div>

            <div className="relative">{props.children}</div>
        </div>
    );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
    const v = props.variant ?? "primary";

    const base =
        "relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 " +
        "active:scale-[0.99]";

    const primary =
        base +
        " text-white bg-zinc-900 hover:bg-zinc-800 " +
        "shadow-[0_10px_30px_rgba(17,24,39,0.18)]";

    const ghost =
        base +
        " text-zinc-800 bg-white/40 hover:bg-white/70 border border-black/10";

    return <button {...props} className={`${v === "primary" ? primary : ghost} ${props.className ?? ""}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                "w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm",
                "outline-none",
                "focus:ring-2 focus:ring-zinc-200",
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
                "outline-none",
                "focus:ring-2 focus:ring-zinc-200",
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

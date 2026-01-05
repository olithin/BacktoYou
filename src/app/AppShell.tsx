import React from "react";

export function Card(props: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={[
                // FE: Calm-premium card surface (works great with the warm background from index.css).
                "rounded-2xl border",
                "bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/65",
                "border-black/10",
                "shadow-[0_12px_40px_rgba(17,24,39,0.10)]",
                "transition",
                props.className ?? "",
            ].join(" ")}
        >
            {props.children}
        </div>
    );
}

export function Button(
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }
) {
    const v = props.variant ?? "primary";

    const base =
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold " +
        "transition duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300";

    const cls =
        v === "primary"
            ? [
                base,
                // FE: Premium primary button (deep ink + subtle highlight).
                "bg-zinc-900 text-white",
                "shadow-[0_10px_24px_rgba(17,24,39,0.18)]",
                "hover:bg-zinc-800 hover:shadow-[0_14px_34px_rgba(17,24,39,0.22)]",
            ].join(" ")
            : [
                base,
                // FE: Ghost button that still looks expensive.
                "bg-white/60 text-zinc-800",
                "border border-black/10",
                "hover:bg-white/80",
                "shadow-[0_6px_16px_rgba(17,24,39,0.08)]",
            ].join(" ");

    return <button {...props} className={`${cls} ${props.className ?? ""}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                "w-full rounded-xl border px-3 py-2 text-sm outline-none",
                "border-black/10 bg-white/70",
                "placeholder:text-zinc-400",
                "focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:border-black/20",
                "transition",
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
                "w-full rounded-xl border px-3 py-2 text-sm outline-none",
                "border-black/10 bg-white/70",
                "placeholder:text-zinc-400",
                "focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:border-black/20",
                "transition",
                props.className ?? "",
            ].join(" ")}
        />
    );
}

export function Label(props: { children: React.ReactNode }) {
    return <div className="text-xs font-semibold text-zinc-700">{props.children}</div>;
}

export function Hint(props: { children: React.ReactNode }) {
    return <div className="text-xs text-zinc-500">{props.children}</div>;
}

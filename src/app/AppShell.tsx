import React from "react";

export function Card(props: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={[
                "relative overflow-hidden rounded-2xl",
                "bg-white/70 backdrop-blur",
                "border border-black/10",
                "shadow-soft",
                // FE: premium micro-interactions
                "transition duration-200",
                "hover:-translate-y-[1px] hover:shadow-[0_20px_55px_rgba(17,24,39,0.14)]",
                props.className ?? "",
            ].join(" ")}
        >
            {/* FE: subtle highlight sheen */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.45]">
                <div className="absolute -top-24 left-1/4 h-48 w-96 rotate-12 bg-gradient-to-r from-white/0 via-white/40 to-white/0 blur-2xl" />
                {/* FE: soft vignette to add depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/[0.03]" />
            </div>

            <div className="relative">{props.children}</div>
        </div>
    );
}

export function Button(
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }
) {
    const v = props.variant ?? "primary";

    const base =
        "relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold " +
        "transition select-none " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70 " +
        "active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none";

    const primary =
        base +
        " text-white bg-zinc-900 hover:bg-zinc-800 " +
        "shadow-[0_10px_30px_rgba(17,24,39,0.18)]";

    const ghost =
        base +
        " text-zinc-800 bg-white/40 hover:bg-white/70 border border-black/10 " +
        "shadow-[0_6px_18px_rgba(17,24,39,0.08)]";

    return <button {...props} className={`${v === "primary" ? primary : ghost} ${props.className ?? ""}`} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                "w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm",
                "outline-none transition",
                "placeholder:text-zinc-400",
                "focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:border-black/20",
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
                "outline-none transition",
                "placeholder:text-zinc-400",
                "focus-visible:ring-2 focus-visible:ring-zinc-200 focus-visible:border-black/20",
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

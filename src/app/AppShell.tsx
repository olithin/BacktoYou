import React from "react";

export function cn(...v: Array<string | undefined | false | null>) {
    return v.filter(Boolean).join(" ");
}

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            {...props}
            className={cn(
                "rounded-2xl border border-zinc-200/70 bg-white/85 backdrop-blur shadow-sm",
                props.className
            )}
        />
    );
}

type ButtonVariant = "solid" | "ghost";

export function Button(
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
) {
    const { variant = "solid", className, ...rest } = props;
    const base =
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition border";
    const solid =
        "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 active:bg-zinc-900";
    const ghost =
        "bg-white/70 text-zinc-800 border-zinc-200 hover:bg-zinc-50 active:bg-white";

    return <button {...rest} className={cn(base, variant === "ghost" ? ghost : solid, className)} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input({ className, ...rest }, ref) {
        return (
            <input
                ref={ref}
                {...rest}
                className={cn(
                    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200",
                    className
                )}
            />
        );
    }
);

export const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
    return (
        <textarea
            ref={ref}
            {...rest}
            className={cn(
                "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200",
                className
            )}
        />
    );
});

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return <label {...props} className={cn("text-sm font-semibold text-zinc-800", props.className)} />;
}

export function Hint(props: React.HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className={cn("text-xs text-zinc-500 mt-1", props.className)} />;
}

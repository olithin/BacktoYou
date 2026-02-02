import React from "react";
import "./admin-theme.css";

export default function LayoutAdmin(p: { children: React.ReactNode }) {
    return (
        <div className="admin-scope">
            {/* optional extra wrapper for the "clean" admin background */}
            <div className="admin-neo-root">{p.children}</div>
        </div>
    );
}

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout";
import HomePage from "../pages/HomePage";
import AdminPage from "../pages/AdminPage";

/** FE: Language-prefixed routes for Cloudflare Pages (static). */
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/admin" element={<Navigate to="/en/admin" replace />} />

        {/* FE: React Router v6 doesn't support regex groups in params like ":lang(en|ru)".
            We accept "/:lang" and validate inside pages via isLocale(). */}
        <Route path="/:lang" element={<HomePage />} />
        <Route path="/:lang/admin" element={<AdminPage />} />

        <Route path="*" element={<Navigate to="/en" replace />} />
      </Routes>
    </Layout>
  );
}

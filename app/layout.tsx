import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// app/layout.tsx
import { ensureVectorExtension } from "@/lib/db";
import { ReactNode } from "react";

export default async function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    await ensureVectorExtension();
    return (
        <html>
            <body>{children}</body>
        </html>
    );
}

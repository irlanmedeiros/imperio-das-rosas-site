import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel Império das Rosas" }, robots: { index: false, follow: false } };

export default function AdminRaiz({ children }: { children: React.ReactNode }) {
  return children;
}

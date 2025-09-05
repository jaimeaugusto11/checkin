import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Gestor de Convidados",
  description: "Gestão de convidados, convites e check-in com QR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-dvh bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}


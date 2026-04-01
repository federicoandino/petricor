import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Conciliador de Ventas — Petricor',
  description: 'Herramienta de conciliación diaria de ventas entre Nave Point y Maxirest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}

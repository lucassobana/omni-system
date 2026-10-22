import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Omni System",
  description: "Acesse o Omni System com suas credenciais.",
  // Não indexar página de login
  robots: { index: false, follow: false },
};

/**
 * Layout da área de autenticação.
 * Não inclui Header, Footer ou WhatsAppButton do root layout.
 * O root layout já fornece <html>, <body>, <ChakraProvider> e <SerwistProvider>.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove o paddingTop que o root layout adiciona para o Header fixo
  return <div style={{ paddingTop: 0 }}>{children}</div>;
}

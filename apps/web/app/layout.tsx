import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { SyncProvider } from "../components/SyncProvider";

export const metadata: Metadata = {
  title: "Omni System",
  description:
    "Plataforma integrada de gestão e segurança Omni System.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Omni",
    startupImage: "/images/icon-512x512.png",
  },
  icons: {
    icon: [
      { url: "/images/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/images/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

// Viewport must be a separate export in Next.js 14+
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#060B15" },
    { media: "(prefers-color-scheme: dark)", color: "#060B15" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className="dark"
      data-theme="dark"
      data-color-mode="dark"
      style={{ backgroundColor: "#060B15", color: "#F8FAFC" }}
      suppressHydrationWarning
    >
      <head>
        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          :root, html, body {
            color-scheme: dark;
            background-color: #060B15 !important;
            color: #F8FAFC !important;
          }
          html {
            min-height: 100vh;
          }
        `}</style>
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // 1. Previne recarregamento infinito causado por ChunkLoadError transiente no Turbopack
                  window.addEventListener('unhandledrejection', function(e) {
                    var isChunkError = e.reason && (
                      e.reason.name === 'ChunkLoadError' ||
                      (e.reason.message && e.reason.message.indexOf('Failed to load chunk') !== -1)
                    );
                    if (isChunkError) {
                      e.preventDefault();
                      e.stopImmediatePropagation();
                      console.warn('[Dev] ChunkLoadError suprimido com sucesso (reload bloqueado):', e.reason && e.reason.message);
                    }
                  }, true);

                  // 2. Desregistra Service Workers antigos e limpa caches em dev para evitar chunks obsoletos
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      for (var i = 0; i < regs.length; i++) {
                        regs[i].unregister();
                      }
                    });
                  }
                  if ('caches' in window) {
                    caches.keys().then(function(keys) {
                      for (var j = 0; j < keys.length; j++) {
                        caches.delete(keys[j]);
                      }
                    });
                  }
                })();
              `,
            }}
          />
        )}
      </head>
      <body style={{ backgroundColor: "#060B15" }}>
        <Providers>
          <SyncProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}

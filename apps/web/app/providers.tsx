"use client";

import React, { useState, useEffect } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ChakraProvider } from "@chakra-ui/react";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { SerwistProvider } from "@serwist/next/react";
import { system } from "../theme";

export function Providers({ children }: { children: React.ReactNode }) {
  // Registry de estilo para SSR no Next.js App Router.
  // Garante que todas as regras de CSS geradas pelo Chakra v3 / Emotion no servidor
  // sejam injetadas diretamente na tag <head> do HTML inicial, prevenindo perda de estilos no reload.
  const [{ cache, flush }] = useState(() => {
    const c = createCache({ key: "css" });
    c.compat = true;
    const prevInsert = c.insert;
    let inserted: string[] = [];
    c.insert = (...args) => {
      const serialized = args[1];
      if (c.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flushFn = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache: c, flush: flushFn };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{
          __html: styles,
        }}
      />
    );
  });

  // Em modo de desenvolvimento, desregistra ativamente qualquer Service Worker legado
  // e limpa os caches do navegador para evitar interceptação indevida de chunks do Turbopack.
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
            console.log("[SW Dev] Service Worker desregistrado:", reg.scope);
          }
        });
      }
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
            console.log("[SW Dev] Cache removido:", key);
          }
        });
      }
    }
  }, []);

  const content = (
    <CacheProvider value={cache}>
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </CacheProvider>
  );

  if (process.env.NODE_ENV === "development") {
    return content;
  }

  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={false}
      reloadOnOnline={false}
    >
      {content}
    </SerwistProvider>
  );
}


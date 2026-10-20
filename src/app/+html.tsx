import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } =
    useServerDocumentContext();

  return (
    <html lang="ko" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0C0D0F" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="PACE" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="manifest" href="manifest.json" />
        <link rel="apple-touch-icon" href="pwa-180.png" />
        <style>{`
          html,
          body,
          #root {
            background-color: #0C0D0F;
            width: 100%;
            height: 100%;
          }

          html {
            min-height: 100%;
          }

          body {
            margin: 0;
            min-height: 100vh;
            min-height: 100dvh;
            overflow: hidden;
            overscroll-behavior: none;
          }

          #root {
            min-height: 100vh;
            min-height: 100dvh;
          }
        `}</style>
        {headNodes}
        <ScrollViewStyleReset />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Custom HTML document for every statically-rendered page.
// This is where PWA + iOS "Add to Home Screen" meta lives.
// Expo Router calls this once per route during `expo export --platform web`.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Brand + theme */}
        <title>InnerBloom</title>
        <meta name="description" content="An emotionally-intelligent space to bloom — daily mood, soul matches, and gentle community." />
        <meta name="theme-color" content="#994531" />

        {/* PWA manifest (Chrome / Android Add to Home Screen) */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS Safari — Add to Home Screen support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* black-translucent: content fills the full screen including behind the
            status bar (edge-to-edge, like Instagram Reels). The status bar has a
            black semi-transparent overlay so white icons stay readable over any
            background. `default` would render a separate white bar above the app. */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="InnerBloom" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Favicons */}
        <link rel="icon" type="image/png" href="/favicon.ico" />

        {/* Open Graph (when someone shares the link) */}
        <meta property="og:title" content="InnerBloom" />
        <meta property="og:description" content="A safe space to heal, grow, and feel truly understood." />
        <meta property="og:type" content="website" />

        {/* Prevent body scroll on web so the app feels native */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: bodyStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Lock the body so the page behaves like a native app shell instead of a
// scrolling web page (status-bar pull, rubber-banding etc. on iOS Safari).
//
// `100dvh` (dynamic viewport height) shrinks when the on-screen keyboard
// opens, so KeyboardAvoidingView + flex children push content up correctly
// on mobile PWA. The `100%` fallback covers browsers without dvh support.
const bodyStyles = `
  body { background-color: #fff8f6; }
  html, body, #root {
    height: 100%;
    height: 100dvh;
    max-width: 100vw;
    overflow-x: hidden;
  }
  body {
    overscroll-behavior: none;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    touch-action: pan-y;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  *:focus, *:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  input, textarea, select {
    font-size: 16px !important;
    -webkit-appearance: none;
    appearance: none;
    border: 0;
    outline: 0;
  }
  input:focus, textarea:focus, select:focus {
    outline: none !important;
    box-shadow: none !important;
  }
`;

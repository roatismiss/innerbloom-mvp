import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Customises the HTML shell for the web/PWA build.
// viewport-fit=cover lets the app extend into the iPhone safe areas (home
// indicator zone) so react-native-safe-area-context can measure them and the
// tab bar can sit flush at the very bottom of the screen.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover is the key flag — without it iOS clips the
            viewport above the home indicator and env(safe-area-inset-bottom)
            returns 0, so the tab bar leaves a white gap at the bottom. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA / iOS standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* black-translucent lets the status bar overlay the app so the
            content starts at y=0 (full edge-to-edge). The app already uses
            useSafeAreaInsets to pad content away from the notch. */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="InnerBloom" />

        {/* Suppress Expo's default ScrollView body margin reset — the app
            manages its own layout. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root { height: 100%; }
          body { background-color: #fff8f6; }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}

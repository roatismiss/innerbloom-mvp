import { createRef } from 'react';
import type { TextInput } from 'react-native';

// Shared ref for the Bloom AI chat composer. Lives at module level so the
// tab-bar's `tabPress` listener (in src/app/(main)/_layout.tsx) can focus the
// input synchronously inside the user gesture — the only way to coax iOS
// Safari (PWA) into opening the keyboard without a manual tap on the input.
export const aiInputRef = createRef<TextInput>();

import { create } from 'zustand';

// UI-only ephemeral state (no persistence). Currently tracks the side
// navigation drawer that overlays every (main) screen.
type UIState = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  drawerOpen: false,
  openDrawer:  () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
}));

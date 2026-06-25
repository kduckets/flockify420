"use client";

import { create } from "zustand";

interface UIStore {
  signInModalOpen: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  signInModalOpen: false,
  openSignInModal: () => set({ signInModalOpen: true }),
  closeSignInModal: () => set({ signInModalOpen: false }),
}));

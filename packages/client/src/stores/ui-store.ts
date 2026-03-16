import { create } from 'zustand'

type Theme = 'dark' | 'light'

type UiState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<UiState>((set) => ({
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  setTheme: (theme) => set({ theme }),
}))

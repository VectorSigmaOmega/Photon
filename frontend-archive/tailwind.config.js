/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Keeping old colors for compatibility
        paper: {
          DEFAULT: "oklch(96% 0.012 75)",
          deep: "oklch(93% 0.018 70)",
          edge: "oklch(88% 0.022 65)",
        },
        ink: {
          DEFAULT: "oklch(18% 0.02 60)",
          soft: "oklch(32% 0.02 60)",
          mute: "oklch(48% 0.018 65)",
          faint: "oklch(72% 0.012 70)",
        },
        signal: {
          DEFAULT: "oklch(58% 0.21 28)",
          deep: "oklch(48% 0.21 28)",
          wash: "oklch(92% 0.05 32)",
        },
        trace: {
          DEFAULT: "oklch(70% 0.09 220)",
          dim: "oklch(82% 0.04 220)",
        },
        ok: "oklch(58% 0.14 155)",
        warn: "oklch(70% 0.16 75)",
        
        // New Premium Dark Theme Colors
        canvas: "#0A0A0A",   // Almost black
        panel: "#121212",    // Slightly elevated
        surface: "#1A1A1A",  // Cards, hovered elements
        border: "#27272A",   // zinc-800
        fg: {
          DEFAULT: "#FAFAFA", // zinc-50
          muted: "#A1A1AA",   // zinc-400
          faint: "#52525B",   // zinc-600
        },
        accent: {
          DEFAULT: "#E4E4E7", // zinc-200 for subtle accents
          glow: "rgba(255,255,255,0.05)",
        }
      },
      fontFamily: {
        display: ["'Inter Tight'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.045em",
        wider: "0.06em",
        widest: "0.18em",
      },
      keyframes: {
        flow: {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-24" },
        },
        pulse2: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        slideUpFade: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        drawIn: {
          "0%": { width: "0%" },
          "100%": { width: "100%" }
        }
      },
      animation: {
        flow: "flow 1.4s linear infinite",
        pulse2: "pulse2 1.6s ease-in-out infinite",
        slideUpFade: "slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        drawIn: "drawIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
      });
    },
  ],
};
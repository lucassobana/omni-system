import { createSystem, defaultConfig } from "@chakra-ui/react";

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        // Cores estáticas da marca OMNI Segurança Privada
        // Escala tonal harmônica expandida a partir do azul institucional (#25487B)
        brand: {
          50: { value: "#F0F5FA" },
          100: { value: "#D9E8F5" }, // ice original
          200: { value: "#B2CEEA" },
          300: { value: "#7DA9D8" }, // destaque de ícones e acentos
          400: { value: "#4A82C2" }, // azul tecnológico vibrante
          500: { value: "#2A64AA" }, // azul de ação primário
          600: { value: "#25487B" }, // security original
          700: { value: "#1C3963" },
          800: { value: "#173054" }, // trust original
          900: { value: "#0F1D33" }, // deep original
          950: { value: "#0A1424" },

          // Aliases preservados para compatibilidade total
          security: { value: "#25487B" },
          trust: { value: "#173054" },
          deep: { value: "#0F1D33" },
          metal: { value: "#A9B2BF" },
          ice: { value: "#D9E8F5" },
          iceForeground: { value: "#F4F6F9" },
          teste: { value: "#092C4E" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Cores do sistema e elementos de UI (Dark Modernizado)
        // Sistema de 4 níveis de elevação a partir do obsidian navy
        bg: {
          DEFAULT: { value: "#060B15" },
          value: "#060B15", // Canvas principal escuro imersivo
          subtle: { value: "#0A1322" }, // Superfície de fundo sutil (filtros, headers)
          surface: { value: "#0E1B30" }, // Superfície primária de cards
          panel: { value: "#13233D" }, // Painéis elevados, modais e dropdowns
          muted: { value: "#172A47" }, // Insets e áreas de código
          hover: { value: "#1D3457" }, // Estado hover de cards e linhas
        },
        fg: {
          DEFAULT: { value: "#F8FAFC" },
          value: "#F8FAFC", // Texto primário de alto contraste (WCAG AAA)
          muted: { value: "#94A3B8" }, // Texto secundário Slate-400 (WCAG AA)
          subtle: { value: "#64748B" }, // Texto terciário / legendas
          accent: { value: "#7DA9D8" }, // Texto destacado no tom brand ice
        },
        card: {
          DEFAULT: { value: "#0E1B30" },
          value: "#0E1B30", // Fundo de card elevado com sutil matiz azul marinho
          hover: { value: "#12223C" },
        },
        cardForeground: {
          value: "#F8FAFC",
        },
        popover: {
          DEFAULT: { value: "#13233D" },
          value: "#13233D",
        },
        popoverForeground: {
          value: "#F8FAFC",
        },
        primary: {
          DEFAULT: { value: "#4A82C2" },
          value: "#4A82C2", // Azul equilibrado, moderno e com excelente legibilidade
          hover: { value: "#5E94D4" },
          active: { value: "#356EB0" },
          subtle: { value: "rgba(42, 100, 170, 0.16)" },
          border: { value: "rgba(74, 130, 194, 0.35)" },
        },
        primaryForeground: {
          value: "#FFFFFF",
        },
        secondary: {
          DEFAULT: { value: "#112037" },
          value: "#112037", // Tom escuro suave com identidade azulada
          hover: { value: "#172B49" },
        },
        secondaryForeground: {
          value: "#E2E8F0",
        },
        muted: {
          DEFAULT: { value: "#172A47" },
          value: "#172A47",
        },
        mutedForeground: {
          value: "#94A3B8",
        },
        accent: {
          DEFAULT: { value: "#162742" },
          value: "#162742", // Estado ativo/hover de itens selecionados
          hover: { value: "#1D3457" },
        },
        accentForeground: {
          value: "#F8FAFC",
        },
        border: {
          DEFAULT: { value: "rgba(255, 255, 255, 0.08)" },
          value: "rgba(255, 255, 255, 0.08)" , // Borda sutil e moderna
          subtle: { value: "rgba(255, 255, 255, 0.06)" },
          emphasized: { value: "rgba(255, 255, 255, 0.16)" },
          interactive: { value: "rgba(74, 130, 194, 0.40)" },
        },
        input: {
          DEFAULT: { value: "rgba(255, 255, 255, 0.04)" },
          value: "rgba(255, 255, 255, 0.04)" , // Fundo sutil de inputs
          border: { value: "rgba(255, 255, 255, 0.10)" },
          focus: { value: "rgba(74, 130, 194, 0.50)" },
        },
        ring: {
          value: "#4A82C2",
        },
        // Tokens semânticos de status refinados e integrados à paleta
        success: {
          DEFAULT: { value: "#10B981" },
          value: "#10B981",
          subtle: { value: "rgba(16, 185, 129, 0.14)" },
          border: { value: "rgba(16, 185, 129, 0.28)" },
          fg: { value: "#34D399" },
        },
        warning: {
          DEFAULT: { value: "#F59E0B" },
          value: "#F59E0B",
          subtle: { value: "rgba(245, 158, 11, 0.14)" },
          border: { value: "rgba(245, 158, 11, 0.28)" },
          fg: { value: "#FBBF24" },
        },
        destructive: {
          DEFAULT: { value: "#EF4444" },
          value: "#EF4444",
          subtle: { value: "rgba(239, 68, 68, 0.14)" },
          border: { value: "rgba(239, 68, 68, 0.28)" },
          fg: { value: "#F87171" },
        },
        destructiveForeground: {
          value: "#FFFFFF",
        },
        info: {
          DEFAULT: { value: "#0EA5E9" },
          value: "#0EA5E9",
          subtle: { value: "rgba(14, 165, 233, 0.14)" },
          border: { value: "rgba(14, 165, 233, 0.28)" },
          fg: { value: "#38BDF8" },
        },
        // Tokens de cinza de alto contraste para botões secundários/outline no dark canvas
        gray: {
          contrast: { value: "#FFFFFF" },
          fg: { value: "#F1F5F9" }, // Slate-100 para leitura clara
          subtle: { value: "rgba(255, 255, 255, 0.08)" }, // Fundo visível em vez de invisível
          muted: { value: "rgba(255, 255, 255, 0.15)" }, // Hover nítido
          border: { value: "rgba(255, 255, 255, 0.20)" }, // Borda claramente perceptível
          solid: { value: "#26354D" },
        },
      },
    },
    keyframes: {
      pulseRing: {
        "0%": { boxShadow: "0 0 0 0 rgba(74, 130, 194, 0.5)" },
        "70%": { boxShadow: "0 0 0 20px rgba(74, 130, 194, 0)" },
        "100%": { boxShadow: "0 0 0 0 rgba(74, 130, 194, 0)" },
      },
      fadeIn: {
        "0%": { opacity: "0", transform: "scale(0.98)" },
        "100%": { opacity: "1", transform: "scale(1)" },
      },
    },
    recipes: {
      container: {
        base: {
          marginInline: "auto",
        }
      },
      button: {
        variants: {
          variant: {
            outline: {
              bg: "rgba(255, 255, 255, 0.06)",
              borderColor: "rgba(255, 255, 255, 0.20)",
              color: "#F8FAFC",
              _hover: {
                bg: "rgba(255, 255, 255, 0.12)",
                borderColor: "rgba(255, 255, 255, 0.35)",
                color: "#FFFFFF",
              },
            },
            surface: {
              bg: "rgba(255, 255, 255, 0.08)",
              borderColor: "rgba(255, 255, 255, 0.20)",
              color: "#F8FAFC",
              _hover: {
                bg: "rgba(255, 255, 255, 0.14)",
                borderColor: "rgba(255, 255, 255, 0.30)",
              },
            },
            subtle: {
              bg: "rgba(255, 255, 255, 0.08)",
              color: "#F8FAFC",
              _hover: {
                bg: "rgba(255, 255, 255, 0.14)",
                color: "#FFFFFF",
              },
            },
            ghost: {
              color: "#E2E8F0",
              _hover: {
                bg: "rgba(255, 255, 255, 0.08)",
                color: "#FFFFFF",
              },
            },
          },
        },
      },
    }
  },
  globalCss: {
    "html, body": {
      margin: 0,
      padding: 0,
      backgroundColor: "#060B15",
      color: "#F8FAFC",
    },
    // Garante que botões outline, surface e secundários tenham destaque perfeito sobre a tela azul escura
    ".chakra-button": {
      "&[data-variant='outline'], &.chakra-button--variant-outline": {
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderColor: "rgba(255, 255, 255, 0.22)",
        color: "#F8FAFC",
        "&:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          borderColor: "rgba(255, 255, 255, 0.38)",
          color: "#FFFFFF",
        },
      },
      "&[data-variant='surface'], &.chakra-button--variant-surface": {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderColor: "rgba(255, 255, 255, 0.22)",
        color: "#F8FAFC",
        "&:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderColor: "rgba(255, 255, 255, 0.38)",
          color: "#FFFFFF",
        },
      },
    },
  },
});


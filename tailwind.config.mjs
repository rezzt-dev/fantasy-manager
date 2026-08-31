/**
 * Fantasy Manager — puente Tailwind del sistema de diseño.
 *
 * Regla única: aquí NO se define ningún color. Todo apunta a las variables CSS
 * de `src/styles/global.css` (capa semántica). Si un valor te hace falta y no
 * existe, se añade primero como token y después se expone aquí.
 *
 * Las claves marcadas «alias heredado» existen para que las clases antiguas
 * (`bg-surface-2`, `text-emerald-400`, `text-brand-muted`…) resuelvan contra la
 * rampa nueva mientras se completa el barrido, en lugar de contra los colores
 * por defecto de Tailwind.
 *
 * @type {import('tailwindcss').Config}
 */

/** Ayuda a escribir `hsl(var(--x) / <alpha>)` sin repetirse. */
const t = (name) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    // Sin esto `.container` queda pegado a la izquierda y toda la landing se
    // desalinea. El gutter crece con la pantalla siguiendo la escala 16/24/32.
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        /* ── Superficies ─────────────────────────────────────────────────── */
        canvas: t('canvas'),
        surface: {
          DEFAULT: t('surface'),
          sunken: t('surface-sunken'),
          raised: t('surface-raised'),
          overlay: t('surface-overlay'),
          hover: t('surface-hover'),
          // alias heredado (surface-2..8, 900, 950)
          2: t('ink-200'),
          3: t('ink-300'),
          4: t('ink-400'),
          5: t('ink-400'),
          6: t('ink-500'),
          7: t('ink-500'),
          8: t('ink-600'),
          900: t('ink-000'),
          950: t('ink-000'),
        },

        /* ── Rampa neutra completa ───────────────────────────────────────── */
        ink: {
          0: t('ink-000'),
          50: t('ink-050'),
          100: t('ink-100'),
          200: t('ink-200'),
          300: t('ink-300'),
          400: t('ink-400'),
          500: t('ink-500'),
          600: t('ink-600'),
          700: t('ink-700'),
          800: t('ink-800'),
          900: t('ink-900'),
        },

        /* ── Texto: exactamente tres niveles ─────────────────────────────── */
        content: {
          DEFAULT: t('text-primary'),
          secondary: t('text-secondary'),
          tertiary: t('text-tertiary'),
          disabled: t('text-disabled'),
        },

        /* ── Acento funcional ────────────────────────────────────────────── */
        accent: {
          DEFAULT: t('accent'),
          fg: t('accent-fg'),
          hover: t('accent-hover'),
          quiet: t('accent-quiet'),
          100: t('lime-100'),
          200: t('lime-200'),
          300: t('lime-300'),
          400: t('lime-400'),
          500: t('lime-500'),
          600: t('lime-600'),
          700: t('lime-700'),
          800: t('lime-800'),
          900: t('lime-900'),
          // shadcn usa `accent`/`accent-foreground` como fondo de hover en
          // menús; se mantiene el nombre pero apuntando a la superficie.
          foreground: t('accent-foreground'),
        },

        /* ── Estado ──────────────────────────────────────────────────────── */
        positive: {
          DEFAULT: t('positive'),
          text: t('positive-text'),
          quiet: t('positive-quiet'),
        },
        negative: {
          DEFAULT: t('negative'),
          text: t('negative-text'),
          quiet: t('negative-quiet'),
        },
        caution: {
          DEFAULT: t('caution'),
          text: t('caution-text'),
          quiet: t('caution-quiet'),
        },
        info: {
          DEFAULT: t('info'),
          text: t('info-text'),
          quiet: t('info-quiet'),
        },

        /* ── Posiciones del campo ────────────────────────────────────────── */
        pitch: {
          gk: t('pos-gk'),
          df: t('pos-df'),
          mf: t('pos-mf'),
          fw: t('pos-fw'),
          co: t('pos-co'),
          // césped: dos verdes muy desaturados, no el verde semántico
          DEFAULT: 'hsl(152 22% 13%)',
          line: 'hsl(152 14% 26%)',
        },

        /* ── Puente shadcn/Radix ─────────────────────────────────────────── */
        background: t('canvas'),
        foreground: t('text-primary'),
        card: { DEFAULT: t('surface'), foreground: t('text-primary') },
        popover: { DEFAULT: t('surface-overlay'), foreground: t('text-primary') },
        primary: { DEFAULT: t('action'), foreground: t('action-fg') },
        secondary: { DEFAULT: t('surface-raised'), foreground: t('text-primary') },
        muted: { DEFAULT: t('surface-raised'), foreground: t('text-tertiary') },
        destructive: { DEFAULT: t('negative'), foreground: t('ink-050') },
        border: t('ink-400'),
        input: t('border-control'),
        ring: t('focus-ring'),

        /* ── Alias heredados ─────────────────────────────────────────────── */
        brand: {
          DEFAULT: t('ink-900'),
          muted: t('ink-800'),
          subtle: t('ink-700'),
        },
        emerald: {
          50: t('pos-400'),
          100: t('pos-400'),
          300: t('pos-400'),
          400: t('positive-text'),
          500: t('positive'),
          600: t('positive'),
          700: t('positive'),
          900: t('positive-quiet'),
        },
        rose: {
          50: t('neg-400'),
          100: t('neg-400'),
          300: t('neg-400'),
          400: t('negative-text'),
          500: t('negative'),
          600: t('negative'),
          700: t('negative'),
          900: t('negative-quiet'),
        },
        amber: {
          50: t('cau-400'),
          100: t('cau-400'),
          300: t('cau-400'),
          400: t('caution-text'),
          500: t('caution'),
          600: t('caution'),
          700: t('caution'),
          900: t('caution-quiet'),
        },
        indigo: {
          50: t('inf-400'),
          100: t('inf-400'),
          300: t('inf-400'),
          400: t('info-text'),
          500: t('info'),
          600: t('info'),
          700: t('info'),
          900: t('info-quiet'),
        },
      },

      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Archivo', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      // Escala tipográfica de Refactoring UI (12 14 16 18 20 24 30 36 48 60 72),
      // con interlineado inversamente proporcional al cuerpo.
      fontSize: {
        xs: ['12px', { lineHeight: '1.45' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.55' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['36px', { lineHeight: '1.15' }],
        '5xl': ['48px', { lineHeight: '1.05' }],
        '6xl': ['60px', { lineHeight: '1' }],
        '7xl': ['72px', { lineHeight: '0.98' }],
      },

      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-xl)',
        '3xl': 'calc(var(--r-xl) + 8px)',
      },

      boxShadow: {
        1: 'var(--elev-1)',
        2: 'var(--elev-2)',
        3: 'var(--elev-3)',
        4: 'var(--elev-4)',
        5: 'var(--elev-5)',
        // alias heredados
        card: 'var(--elev-1)',
        'card-hover': 'var(--elev-3)',
        glow: '0 0 0 1px hsl(var(--lime-500) / 0.35), 0 8px 28px -10px hsl(var(--lime-500) / 0.4)',
        'glow-sm': '0 0 0 1px hsl(var(--lime-500) / 0.28)',
        'glow-lg': '0 0 0 1px hsl(var(--lime-500) / 0.4), 0 16px 44px -12px hsl(var(--lime-500) / 0.45)',
      },

      transitionTimingFunction: {
        out: 'var(--ease-out)',
        in: 'var(--ease-in)',
        spring: 'var(--ease-spring)',
      },
      transitionDuration: {
        instant: 'var(--dur-instant)',
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },

      zIndex: {
        raised: 'var(--z-raised)',
        sticky: 'var(--z-sticky)',
        nav: 'var(--z-nav)',
        header: 'var(--z-header)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },

      // Solo los peldaños de la escala; nada de 4.5rem improvisados.
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        // Latido del punto «en vivo»: contenido, no un pulso publicitario.
        breathe: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.85)' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down var(--dur-base) var(--ease-out)',
        'accordion-up': 'accordion-up var(--dur-base) var(--ease-out)',
        'fade-up': 'fade-up var(--dur-slow) var(--ease-out) both',
        'fade-in': 'fade-in var(--dur-base) var(--ease-out) both',
        'scale-in': 'scale-in var(--dur-fast) var(--ease-out) both',
        'slide-in-left': 'slide-in-left var(--dur-base) var(--ease-out) both',
        shimmer: 'shimmer 1.8s var(--ease-out) infinite',
        breathe: 'breathe 2s var(--ease-out) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

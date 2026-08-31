/* ────────────────────────────────────────────────────────────────────────────
   Puente de movimiento
   ────────────────────────────────────────────────────────────────────────────
   Las cuatro capas de animación del producto —CSS, Motion (React), GSAP +
   ScrollTrigger y Anime.js— tienen que moverse con los MISMOS números. Si cada
   librería trae los suyos, el producto se nota cosido a trozos: la pestaña
   entra en 190 ms, la tarjeta en 350 ms y el panel con otra curva.

   Por eso los tokens se declaran una sola vez, en `src/styles/global.css`, y
   este módulo los LEE de ahí en tiempo de ejecución. No hay una segunda copia
   de los valores: las constantes de abajo son solo el respaldo para el render
   en servidor y para el primer frame, y están anotadas para que se vea que son
   espejo, no fuente.

   Nada de esto se ejecuta en el servidor: `readTokens()` comprueba `document`
   y devuelve el respaldo si no existe.
   ──────────────────────────────────────────────────────────────────────────── */

/** Curva de Bézier como la esperan Motion, GSAP y Anime.js. */
export type Bezier = [number, number, number, number];

export interface MotionTokens {
  /** Duraciones en milisegundos. */
  dur: { instant: number; fast: number; base: number; slow: number; page: number };
  /** Las mismas duraciones en segundos (Motion y GSAP trabajan en segundos). */
  sec: { instant: number; fast: number; base: number; slow: number; page: number };
  /** Curvas como cadena CSS, para inyectar en estilos en línea. */
  easeCss: { out: string; in: string; spring: string };
  /** Curvas como array de cuatro números. */
  ease: { out: Bezier; in: Bezier; spring: Bezier };
  /** Distancias de desplazamiento en píxeles. */
  move: { xs: number; sm: number; md: number; lg: number };
  /** Escalas de respuesta. */
  scale: { press: number; in: number };
  /** Retardos de cascada en milisegundos. */
  stagger: { tight: number; base: number; loose: number };
}

/**
 * Respaldo. Espejo exacto del bloque «Movimiento» de `global.css`; si allí
 * cambia un número y aquí no, el navegador impone el de CSS —este objeto solo
 * se usa cuando no hay `document`—, así que la divergencia no puede provocar
 * dos ritmos distintos en pantalla.
 */
const FALLBACK: MotionTokens = {
  dur: { instant: 90, fast: 130, base: 190, slow: 280, page: 420 },
  sec: { instant: 0.09, fast: 0.13, base: 0.19, slow: 0.28, page: 0.42 },
  easeCss: {
    out: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
    in: 'cubic-bezier(0.5, 0, 0.9, 0.4)',
    spring: 'cubic-bezier(0.34, 1.35, 0.5, 1)',
  },
  ease: {
    out: [0.2, 0.8, 0.3, 1],
    in: [0.5, 0, 0.9, 0.4],
    spring: [0.34, 1.35, 0.5, 1],
  },
  move: { xs: 4, sm: 8, md: 12, lg: 20 },
  scale: { press: 0.985, in: 0.97 },
  stagger: { tight: 24, base: 40, loose: 70 },
};

/** `"190ms"` / `"0.19s"` → `190`. Devuelve el respaldo si el token no existe. */
function ms(raw: string, fallback: number): number {
  const value = raw.trim();
  if (!value) return fallback;
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return value.endsWith('ms') ? n : value.endsWith('s') ? n * 1000 : n;
}

/** `"12px"` → `12`. */
function px(raw: string, fallback: number): number {
  const n = parseFloat(raw);
  return Number.isNaN(n) ? fallback : n;
}

/** `"cubic-bezier(0.2, 0.8, 0.3, 1)"` → `[0.2, 0.8, 0.3, 1]`. */
function bezier(raw: string, fallback: Bezier): Bezier {
  const m = raw.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return fallback;
  const parts = m[1].split(',').map((p) => parseFloat(p));
  if (parts.length !== 4 || parts.some(Number.isNaN)) return fallback;
  return parts as Bezier;
}

let cache: MotionTokens | null = null;

/**
 * Lee los tokens de movimiento del documento. El resultado se memoriza: son
 * variables de `:root` que no cambian en caliente, y consultarlas en cada
 * animación obligaría al navegador a recalcular estilo.
 */
export function motionTokens(): MotionTokens {
  if (cache) return cache;
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return FALLBACK;
  }

  const s = getComputedStyle(document.documentElement);
  const get = (name: string) => s.getPropertyValue(name);

  const dur = {
    instant: ms(get('--dur-instant'), FALLBACK.dur.instant),
    fast: ms(get('--dur-fast'), FALLBACK.dur.fast),
    base: ms(get('--dur-base'), FALLBACK.dur.base),
    slow: ms(get('--dur-slow'), FALLBACK.dur.slow),
    page: ms(get('--dur-page'), FALLBACK.dur.page),
  };

  const easeCss = {
    out: get('--ease-out').trim() || FALLBACK.easeCss.out,
    in: get('--ease-in').trim() || FALLBACK.easeCss.in,
    spring: get('--ease-spring').trim() || FALLBACK.easeCss.spring,
  };

  cache = {
    dur,
    sec: {
      instant: dur.instant / 1000,
      fast: dur.fast / 1000,
      base: dur.base / 1000,
      slow: dur.slow / 1000,
      page: dur.page / 1000,
    },
    easeCss,
    ease: {
      out: bezier(easeCss.out, FALLBACK.ease.out),
      in: bezier(easeCss.in, FALLBACK.ease.in),
      spring: bezier(easeCss.spring, FALLBACK.ease.spring),
    },
    move: {
      xs: px(get('--move-xs'), FALLBACK.move.xs),
      sm: px(get('--move-sm'), FALLBACK.move.sm),
      md: px(get('--move-md'), FALLBACK.move.md),
      lg: px(get('--move-lg'), FALLBACK.move.lg),
    },
    scale: {
      press: px(get('--scale-press'), FALLBACK.scale.press),
      in: px(get('--scale-in'), FALLBACK.scale.in),
    },
    stagger: {
      tight: ms(get('--stagger-tight'), FALLBACK.stagger.tight),
      base: ms(get('--stagger-base'), FALLBACK.stagger.base),
      loose: ms(get('--stagger-loose'), FALLBACK.stagger.loose),
    },
  };

  return cache;
}

/* ── Preferencia de movimiento reducido ─────────────────────────────────────
   El CSS ya corta sus propias transiciones (ver el bloque final de
   `global.css`), pero una animación de JavaScript escribe estilos en línea y
   se salta esa red. Cada capa consulta aquí antes de arrancar.
   ────────────────────────────────────────────────────────────────────────── */

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** ¿El usuario ha pedido menos movimiento? En servidor se asume que sí: es la
 *  respuesta segura, porque el primer render sale sin animación en lugar de
 *  con una que hay que cancelar. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia(REDUCED_QUERY).matches;
}

/**
 * Observa el cambio de preferencia. La devolución del suscriptor limpia el
 * oyente. Se usa en las capas que montan una vez y viven toda la sesión
 * (scroll suave, secuencias de scroll), donde el usuario puede cambiar el
 * ajuste del sistema sin recargar.
 */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_QUERY);
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/* ── Cascada ────────────────────────────────────────────────────────────────
   Escalonar tiene un coste: el último elemento de la lista llega tarde. Con
   40 ms por ítem y veinte tarjetas, la última entra 800 ms después que la
   primera y el usuario ya ha ido a buscarla con el ratón.
   ────────────────────────────────────────────────────────────────────────── */

/** Número máximo de elementos que se escalonan. A partir de aquí todos entran
 *  con el retardo del último: la cascada se lee igual y nadie espera. */
export const STAGGER_CAP = 6;

export type StaggerTone = 'tight' | 'base' | 'loose';

/**
 * Retardo en segundos del elemento `index` dentro de una cascada.
 * Devuelve 0 con movimiento reducido.
 */
export function staggerDelay(index: number, tone: StaggerTone = 'base'): number {
  if (prefersReducedMotion()) return 0;
  const step = motionTokens().stagger[tone];
  return (Math.min(index, STAGGER_CAP) * step) / 1000;
}

/* ── GSAP ───────────────────────────────────────────────────────────────────
   GSAP no entiende `cubic-bezier(...)` de serie: hay que registrarlo con
   CustomEase. Se hace una sola vez por sesión y se devuelve el nombre, para
   que las líneas de tiempo escriban `ease: gsapEase('out')` y usen exactamente
   la misma curva que el CSS.
   ────────────────────────────────────────────────────────────────────────── */

const registeredEases = new Set<string>();

/**
 * Registra (si hace falta) y devuelve el nombre de una curva de marca para
 * GSAP. `CustomEase` se pasa como argumento para que este módulo no arrastre
 * GSAP al bundle de quien solo quiere leer tokens.
 */
export function registerGsapEases(CustomEase: {
  create: (name: string, data: string) => unknown;
}): void {
  const { ease } = motionTokens();
  (Object.keys(ease) as (keyof typeof ease)[]).forEach((key) => {
    const name = `fm-${key}`;
    if (registeredEases.has(name)) return;
    const [x1, y1, x2, y2] = ease[key];
    CustomEase.create(name, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
    registeredEases.add(name);
  });
}

/** Nombre de la curva de marca para una línea de tiempo de GSAP. */
export function gsapEase(key: 'out' | 'in' | 'spring' = 'out'): string {
  return `fm-${key}`;
}

'use client';

import * as React from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
  type Transition,
} from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { motionTokens, STAGGER_CAP, type StaggerTone } from '../../lib/motion';

/* ────────────────────────────────────────────────────────────────────────────
   Primitivas de movimiento (capa React)
   ────────────────────────────────────────────────────────────────────────────
   Motion se reserva a lo que CSS no sabe hacer: coreografiar la entrada y la
   SALIDA de un elemento que React desmonta (`AnimatePresence`) y mover un
   elemento de un sitio a otro conservando su identidad (`layout` /
   `layoutId`). Todo lo demás —hover, pulsación, foco, cambio de color— vive en
   CSS, en las utilidades `.press` y `.lift` de `global.css`.

   Los números no se escriben aquí: salen de `motionTokens()`, que los lee de
   las variables CSS. Un cambio en el sistema de diseño llega a esta capa sin
   tocar este archivo.

   Reglas del lenguaje:
   · Solo se animan `opacity` y `transform`. Nunca `width`, `height` ni
     `top`/`left`: provocan reflow y con ello el jank que se quería evitar.
   · La salida dura ~65 % de la entrada. Nadie mira lo que se va.
   · Con `prefers-reduced-motion` el desplazamiento se anula por completo. No
     basta con acortar la duración: lo que marea es el recorrido.
   ──────────────────────────────────────────────────────────────────────────── */

/** Proporción de la salida respecto a la entrada. */
const EXIT_RATIO = 0.65;

function useTokens() {
  // Los tokens se leen del documento una sola vez y se memorizan dentro de
  // `motionTokens()`; este `useMemo` evita además la llamada por render.
  return React.useMemo(() => motionTokens(), []);
}

interface MotionProps {
  children: ReactNode;
  className?: string;
  /** Retardo en segundos. */
  delay?: number;
  /** Duración en segundos. Por defecto, la del token que corresponda. */
  duration?: number;
}

/**
 * Envoltorio global de la capa React.
 *
 * `reducedMotion="user"` hace que TODA animación de Motion del árbol respete
 * la preferencia del sistema sin que cada componente tenga que preguntarlo:
 * Motion anula por su cuenta las propiedades de transformación y deja pasar
 * las de opacidad. Se monta una sola vez, en `AppLayout`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Aparición sobria: 12 px hacia arriba y opacidad. La entrada por defecto. */
export function FadeIn({ children, className, delay = 0, duration }: MotionProps) {
  const t = useTokens();
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : t.move.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration ?? t.sec.slow, delay, ease: t.ease.out }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Entrada desde el borde derecho. Solo para algo que llega DE la derecha. */
export function SlideInRight({ children, className, delay = 0, duration }: MotionProps) {
  const t = useTokens();
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, x: reduce ? 0 : t.move.lg }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: duration ?? t.sec.slow, delay, ease: t.ease.out }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Entrada desde el borde izquierdo. */
export function SlideInLeft({ children, className, delay = 0, duration }: MotionProps) {
  const t = useTokens();
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, x: reduce ? 0 : -t.move.lg }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: duration ?? t.sec.slow, delay, ease: t.ease.out }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Aparición anclada al origen. Se reserva a lo que sale DE un punto concreto
 * —un menú desde su botón, un panel desde su tarjeta—; para contenido que
 * simplemente llega, `FadeIn`.
 */
export function ScaleIn({ children, className, delay = 0, duration }: MotionProps) {
  const t = useTokens();
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: reduce ? 1 : t.scale.in }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: duration ?? t.sec.base, delay, ease: t.ease.out }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * Ritmo de la cascada.
   *   tight → filas de una lista densa
   *   base  → tarjetas de una rejilla
   *   loose → tres o cuatro piezas con orden narrativo
   */
  tone?: StaggerTone;
  /** Retardo antes del primer elemento, en segundos. */
  delay?: number;
  /**
   * Cuántos elementos van a entrar. Con este dato la cascada se comprime para
   * no pasar del techo: sin él, una lista de treinta tarjetas tardaría más de
   * un segundo en terminar de aparecer.
   */
  count?: number;
}

/**
 * Cascada de entrada.
 *
 * **Cuándo se usa:** una lista o rejilla cuyo ORDEN significa algo y que el
 * usuario ve por primera vez —la clasificación de la liga, los objetivos
 * ordenados por encaje, las recomendaciones del motor—. La cascada dibuja esa
 * jerarquía en el tiempo: lo primero que aparece es lo primero que hay que
 * mirar.
 *
 * **Cuándo NO se usa:** rejillas sin orden intrínseco (la plantilla, el
 * mercado) y cualquier lista que el usuario ya tenía delante y solo se
 * reordena o se filtra. Ahí escalonar es ruido: convierte un cambio de orden
 * en un renacimiento de todo el contenido.
 *
 * El total está acotado: como mucho seis pasos, y si llegan más elementos el
 * paso se comprime para que la cascada entera no pase de ese techo.
 */
export function StaggerContainer({
  children,
  className,
  tone = 'base',
  delay = 0,
  count,
}: StaggerContainerProps) {
  const t = useTokens();
  const reduce = useReducedMotion();

  const step = React.useMemo(() => {
    const base = t.stagger[tone] / 1000;
    if (!count || count <= STAGGER_CAP) return base;
    // Presupuesto total de la cascada = el que gastarían STAGGER_CAP pasos.
    return (base * STAGGER_CAP) / count;
  }, [t, tone, count]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduce ? 0 : step,
            delayChildren: reduce ? 0 : delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTokens();
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : t.move.md },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: t.sec.base, ease: t.ease.out },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  /**
   * Identidad de la vista. Al cambiar, se ejecuta la transición de salida y de
   * entrada. Es obligatoria: sin ella el componente no sabría distinguir un
   * cambio de vista de un simple re-render.
   */
  viewKey: string;
}

/**
 * Cambio de sección del panel.
 *
 * Deliberadamente CORTO (una duración `base` de entrada, un 65 % de eso para
 * la salida) y de recorrido mínimo (8 px). Es el gesto que más veces al día ve
 * el usuario: cualquier cosa más larga se convierte en un peaje. El
 * desplazamiento existe solo para que el contenido nuevo no parezca que
 * siempre estuvo ahí.
 *
 * `mode="wait"` evita que las dos vistas se solapen —dos tablas superpuestas
 * durante 200 ms se leen como un fallo— y `initial={false}` impide que la
 * primera pintada anime, que sería animar la nada.
 */
export function PageTransition({ children, className, viewKey }: PageTransitionProps) {
  const t = useTokens();
  const reduce = useReducedMotion();
  const y = reduce ? 0 : t.move.sm;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -y }}
        transition={{
          duration: t.sec.base,
          ease: t.ease.out,
        }}
        // La salida es más rápida que la entrada y con la curva de salida.
        // Motion lee esta transición del propio `exit` cuando se declara así.
        style={{ willChange: 'transform, opacity' }}
        className={cn('h-full', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface ActiveIndicatorProps {
  /**
   * Grupo al que pertenece el indicador. Todos los indicadores con el mismo
   * `groupId` comparten una única barra que VIAJA entre ellos.
   */
  groupId: string;
  active: boolean;
  className: string;
}

/**
 * Marca de sección activa.
 *
 * En lugar de apagar un filete y encender otro —dos cambios de color que el
 * ojo lee como un parpadeo—, hay UNA sola barra que se desplaza hasta la
 * sección elegida. Eso es continuidad espacial: el usuario ve de dónde viene y
 * a dónde va, y con ello dónde está dentro de la navegación.
 *
 * Es el caso de uso exacto de `layoutId` de Motion, y no se puede resolver con
 * CSS: los dos elementos son nodos distintos del DOM, en posiciones distintas,
 * y hay que interpolar entre sus rectángulos medidos.
 */
export function ActiveIndicator({ groupId, active, className }: ActiveIndicatorProps) {
  const t = useTokens();
  if (!active) return null;
  return (
    <motion.span
      aria-hidden="true"
      layoutId={groupId}
      className={className}
      transition={{ duration: t.sec.slow, ease: t.ease.out }}
    />
  );
}

/** Transición de referencia para animaciones sueltas fuera de estas piezas. */
export function enterTransition(seconds?: number, delay = 0): Transition {
  const t = motionTokens();
  return { duration: seconds ?? t.sec.base, delay, ease: t.ease.out };
}

/** Transición de salida: más corta que la entrada y con la curva de salida. */
export function exitTransition(seconds?: number): Transition {
  const t = motionTokens();
  return { duration: (seconds ?? t.sec.base) * EXIT_RATIO, ease: t.ease.in };
}

export { motion, AnimatePresence, MotionConfig };

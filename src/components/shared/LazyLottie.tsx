'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { prefersReducedMotion } from '../../lib/motion';

/* ────────────────────────────────────────────────────────────────────────────
   Ilustración vectorial animada — Lottie, siempre en diferido
   ────────────────────────────────────────────────────────────────────────────
   Lottie está reservado a un caso y solo a uno: una ILUSTRACIÓN de varias capas
   con su propia línea de tiempo, que no se puede dibujar con dos `div` y una
   transición. En este producto hay exactamente un sitio así —la pantalla sin
   salida de «no juegas ninguna liga»—, y por eso hay exactamente un `.json`.

   Lo que NO se hace con Lottie aquí:
   · Estados de carga. La regla del sistema es esqueleto con la silueta del
     contenido real, no una ilustración girando. Una pieza de Lottie en un
     esqueleto además retrasa el propio indicador de carga.
   · Iconografía. Para eso está Lucide, que pesa cero de más y hereda el color.

   El reproductor (`lottie-web`, ~250 KB sin comprimir) NO entra en el paquete
   principal: se pide con `import()` y solo cuando el componente entra en
   pantalla. Quien no llegue nunca a esta pantalla —la mayoría— no lo descarga.
   ──────────────────────────────────────────────────────────────────────────── */

interface LazyLottieProps {
  /** Ruta pública del `.json`. Se pide con `fetch`, no se empaqueta. */
  src: string;
  /**
   * Descripción para lectores de pantalla. Si la ilustración es decorativa
   * —lo habitual, porque el texto de al lado ya lo cuenta— déjalo vacío y el
   * elemento queda oculto para la tecnología de apoyo.
   */
  label?: string;
  className?: string;
  /** Fotograma que se muestra en lugar de animar. Ver abajo. */
  loop?: boolean;
}

/**
 * Ilustración Lottie de carga diferida.
 *
 * Con `prefers-reduced-motion` no se descarga nada y no se pinta nada: el hueco
 * queda reservado con las mismas dimensiones —sin salto de layout— y la
 * información la lleva el texto que acompaña a la ilustración, que es donde
 * siempre ha estado.
 */
export default function LazyLottie({ src, label, className, loop = true }: LazyLottieProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  // Solo se carga cuando el hueco entra en pantalla. En la práctica esta
  // ilustración está siempre visible al montarse, pero el observador deja el
  // componente listo para usarse más abajo en una página larga sin volver a
  // pensarlo.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || prefersReducedMotion()) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let animation: { destroy: () => void } | null = null;

    (async () => {
      // `lottie_light` es la compilación sin expresiones ni soporte de efectos:
      // la mitad de peso, y esta ilustración no usa nada de eso.
      const lottie = (await import('lottie-web/build/player/lottie_light')).default;
      if (destroyed) return;
      animation = lottie.loadAnimation({
        container: host,
        renderer: 'svg',
        loop,
        autoplay: true,
        path: src,
      });
    })();

    return () => {
      destroyed = true;
      animation?.destroy();
    };
  }, [visible, src, loop]);

  return (
    <div
      ref={hostRef}
      className={cn('shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}

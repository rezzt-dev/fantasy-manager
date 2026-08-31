/* ────────────────────────────────────────────────────────────────────────────
   Trazo de la marca — Anime.js v4
   ────────────────────────────────────────────────────────────────────────────
   Por qué Anime.js y no otra cosa:

   · CSS no puede. Dibujar un trazo es animar `stroke-dashoffset` desde la
     longitud EXACTA de cada figura, y esa longitud solo se conoce en tiempo de
     ejecución (`getTotalLength()`) y cambia con el tamaño al que se pinte el
     símbolo. Con un número fijo en la hoja de estilos, el trazo se corta o se
     queda a medias según la pantalla.
   · GSAP sobra. Esto es una línea de tiempo de cuatro elementos que dura menos
     de un segundo y se ejecuta una vez. Cargar el motor completo de GSAP —que
     en la portada ya está reservado para la secuencia de scroll— para esto es
     pagar dos veces por lo mismo. `animejs/timeline` y `animejs/svg` son dos
     módulos sueltos y pequeños.
   · Motion no aplica: aquí no hay estado de React, ni montaje, ni gesto. Es un
     SVG estático que ha renderizado Astro.

   Qué dibuja, y en qué orden: el perímetro del campo, la línea de medio campo,
   el círculo central y por último el punto de acento —la jugada que
   desequilibra—, que llega el último porque es el que lleva el significado. El
   orden es el del propio logotipo, no una cascada cualquiera.
   ──────────────────────────────────────────────────────────────────────────── */

import { motionTokens, prefersReducedMotion } from './motion';

/**
 * Dibuja los símbolos marcados con `data-logo-mark` dentro de `root`.
 *
 * No hace nada —ni siquiera descarga Anime.js— si el usuario ha pedido menos
 * movimiento o si no hay ningún símbolo marcado. El símbolo ya viene pintado y
 * completo en el HTML: esta función solo lo borra y lo vuelve a trazar, así que
 * si falla o no llega a ejecutarse, no se pierde nada.
 */
export async function drawLogoMarks(root: ParentNode = document): Promise<void> {
  const marks = Array.from(root.querySelectorAll<SVGElement>('[data-logo-mark]'));
  if (marks.length === 0 || prefersReducedMotion()) return;

  const [{ createTimeline }, { createDrawable }, { cubicBezier }, { stagger }] = await Promise.all([
    import('animejs/timeline'),
    import('animejs/svg'),
    import('animejs/easings/cubic-bezier'),
    import('animejs/utils'),
  ]);

  const t = motionTokens();
  // En la v4 la sintaxis de cadena `ease: 'cubicBezier(...)'` se retiró del
  // núcleo: la curva se importa y se pasa como función. Los cuatro números
  // siguen saliendo del token `--ease-out`, así que el trazo se mueve con la
  // misma curva que el resto del producto.
  const easeOut = cubicBezier(...t.ease.out);
  const easeSpring = cubicBezier(...t.ease.spring);

  marks.forEach((mark) => {
    const strokes = Array.from(mark.querySelectorAll<SVGGeometryElement>('[data-logo-stroke]'));
    const dot = mark.querySelector<SVGGraphicsElement>('[data-logo-dot]');
    if (strokes.length === 0) return;

    // `createDrawable` mide cada figura con la API del navegador y la envuelve
    // en un objetivo con la propiedad `draw`. Esa medida en caliente es
    // justamente lo que no se puede escribir a mano en el CSS.
    const drawables = createDrawable(strokes);

    const timeline = createTimeline().add(drawables, {
      // De un trazo de longitud cero al trazo completo.
      draw: ['0 0', '0 1'],
      duration: t.dur.page,
      ease: easeOut,
      // 60 ms entre figuras: se percibe la secuencia sin que la última llegue
      // tarde. El símbolo queda hecho en algo más de medio segundo.
      delay: stagger(60),
    });

    if (dot) {
      // Un `scale` sobre un elemento SVG toma como origen el (0,0) del lienzo
      // salvo que se le diga otra cosa: sin esto, el punto no crece desde su
      // centro, sale disparado desde la esquina.
      dot.style.transformBox = 'fill-box';
      dot.style.transformOrigin = 'center';

      // El punto no se dibuja: aparece. Es un disco relleno, no un trazo. Entra
      // con la curva de asentamiento —el único rebote del sistema— porque es la
      // confirmación de que el símbolo está completo. Se solapa con el final
      // del trazo: encadenarlo sin solape haría que el conjunto se sintiera
      // lento.
      timeline.add(
        dot,
        {
          opacity: [0, 1],
          scale: [0.4, 1],
          duration: t.dur.slow,
          ease: easeSpring,
        },
        `-=${t.dur.fast}`,
      );
    }
  });
}

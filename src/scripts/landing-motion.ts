/* ────────────────────────────────────────────────────────────────────────────
   Movimiento de la portada
   ────────────────────────────────────────────────────────────────────────────
   Punto de entrada único de todo el JavaScript de animación de la página
   pública. Se carga en diferido y después de la primera pintada, así que no
   entra en la ruta crítica: la portada se lee entera sin él.

   Tres cosas, ni una más:
     1. Scroll suave (Lenis) enganchado al ticker de GSAP.
     2. La secuencia de los tres pasos de «Cómo funciona» (ScrollTrigger).
     3. El trazo del símbolo de marca (Anime.js).

   Todo lo demás de la portada —hover de enlaces, elevación de tarjetas, la
   flecha del botón, la entrada del héroe— es CSS y no pasa por aquí.
   ──────────────────────────────────────────────────────────────────────────── */

import { initScrollLayer, bindAnchorScroll, type ScrollLayer } from '../lib/motion-scroll';
import { drawLogoMarks } from '../lib/motion-brand';
import { prefersReducedMotion } from '../lib/motion';

/**
 * «Cómo funciona»: el raíl se traza a medida que se baja.
 *
 * Dos disparadores con papeles distintos:
 *
 *   · El trazo va **encadenado** al scroll (`scrub`). No es una animación que
 *     se dispara al entrar en pantalla: es una barra de progreso: si el lector
 *     sube, el trazo se recoge. Por eso la curva es lineal —`none`—; la curva
 *     la pone el gesto del usuario, y meterle un `ease` encima haría que el
 *     raíl se adelantara o se retrasara respecto al dedo.
 *   · El encendido de cada paso es **discreto**: ocurre o no ocurre cuando el
 *     paso llega a la línea de lectura. Aquí JavaScript solo decide CUÁNDO;
 *     el cambio de color lo hace la transición CSS que ya lleva el elemento.
 */
function buildStepsSequence(layer: ScrollLayer): void {
  const { gsap, ScrollTrigger } = layer;
  if (!gsap || !ScrollTrigger) return;

  const list = document.querySelector<HTMLElement>('[data-steps]');
  const progress = document.querySelector<HTMLElement>('[data-steps-progress]');
  if (!list || !progress) return;

  gsap.set(progress, { scaleY: 0 });
  gsap.to(progress, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: list,
      // Empieza cuando el primer paso entra en el tercio inferior y termina
      // cuando el último ya está leído. El raíl acompaña a la lectura, no al
      // borde de la ventana.
      start: 'top 72%',
      end: 'bottom 62%',
      // Medio segundo de amortiguación: sin ella el trazo va pegado al píxel
      // del scroll y se ve nervioso.
      scrub: 0.5,
    },
  });

  // El HTML pinta los pasos YA encendidos: ese es el estado correcto para quien
  // no ejecute este script o tenga el movimiento reducido. Aquí se rebobinan
  // justo antes de crear los disparadores, que es la única situación en la que
  // el estado apagado tiene sentido.
  list.querySelectorAll<HTMLElement>('[data-step]').forEach((step) => {
    const dot = step.querySelector<HTMLElement>('[data-step-dot]');
    const number = step.querySelector<HTMLElement>('[data-step-number]');

    const setReached = (reached: boolean) => {
      dot?.classList.toggle('border-accent', reached);
      dot?.classList.toggle('bg-accent', reached);
      dot?.classList.toggle('border-ink-400', !reached);
      number?.classList.toggle('text-accent', reached);
      number?.classList.toggle('text-content-tertiary', !reached);
    };

    setReached(false);

    ScrollTrigger.create({
      trigger: step,
      start: 'top 68%',
      onEnter: () => setReached(true),
      // Al subir se apaga: el raíl y los pasos cuentan siempre lo mismo, se
      // vaya en la dirección que se vaya.
      onLeaveBack: () => setReached(false),
    });
  });
}

async function start(): Promise<void> {
  // El trazo de la marca no depende del scroll y es lo primero que se ve:
  // arranca sin esperar a que Lenis y GSAP terminen de descargarse.
  void drawLogoMarks();

  const layer = await initScrollLayer();
  bindAnchorScroll(layer);

  // Con movimiento reducido `initScrollLayer` devuelve una capa inerte y sin
  // GSAP: no hay secuencia de scroll que montar, y el raíl se queda como está
  // en el HTML, dibujado entero.
  if (!prefersReducedMotion()) buildStepsSequence(layer);
}

// `requestIdleCallback` deja pasar antes la primera interacción y la carga de
// fuentes: el movimiento nunca compite con el contenido por el hilo principal.
// El respaldo de 200 ms cubre a Safari, que todavía no lo implementa.
const idle = window.requestIdleCallback;
if (typeof idle === 'function') {
  idle(() => void start(), { timeout: 1200 });
} else {
  window.setTimeout(() => void start(), 200);
}

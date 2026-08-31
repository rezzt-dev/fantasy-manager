/* ────────────────────────────────────────────────────────────────────────────
   Capa de scroll — Lenis + GSAP ScrollTrigger
   ────────────────────────────────────────────────────────────────────────────
   Solo para las páginas de PRESENTACIÓN (portada, extensión). El panel NO lleva
   scroll suave, y es una decisión, no un olvido:

   · El panel es una herramienta que se usa con teclado y con tablas largas. El
     scroll con inercia añade un retardo entre la rueda y el pixel, y en una
     tabla de doscientas filas eso se siente como que la aplicación va lenta.
   · Re-Página/Inicio/Fin y el desplazamiento al enfocar con el tabulador dejan
     de ser instantáneos, que es justo lo contrario de lo que espera quien
     navega con teclado.
   · Lenis transforma el contenedor de scroll, y eso interfiere con las
     cabeceras `position: sticky` de las tablas del panel.

   En la portada, en cambio, el scroll ES la narración: el usuario baja leyendo
   y la inercia da continuidad entre secciones.

   Un solo bucle: Lenis NO monta su propio `requestAnimationFrame`; se engancha
   al ticker de GSAP. Dos bucles independientes producen exactamente el fallo
   que se quiere evitar —ScrollTrigger midiendo en un frame y Lenis pintando en
   otro—, y se ve como un desfase de uno o dos frames en todo lo anclado al
   scroll.
   ──────────────────────────────────────────────────────────────────────────── */

import { prefersReducedMotion, motionTokens, registerGsapEases } from './motion';

export interface ScrollLayer {
  /** Lleva la vista a un elemento respetando la cabecera pegajosa. */
  scrollTo: (target: string | HTMLElement) => void;
  /** Desmonta la capa entera: ticker, oyentes y disparadores. */
  destroy: () => void;
  /**
   * GSAP ya inicializado, con ScrollTrigger y las curvas de marca registradas.
   * Es `null` cuando el usuario ha pedido menos movimiento: en ese caso ni
   * siquiera se ha descargado la librería, y quien quiera montar una secuencia
   * de scroll simplemente no la monta.
   */
  gsap: typeof import('gsap')['gsap'] | null;
  ScrollTrigger: typeof import('gsap/ScrollTrigger')['ScrollTrigger'] | null;
}

/** Alto de la cabecera pegajosa de la portada, en píxeles. */
const STICKY_HEADER = 64;

/**
 * Monta el scroll suave y deja GSAP listo para animaciones ancladas al scroll.
 *
 * Las tres librerías se cargan con `import()` dinámico: la portada no paga su
 * peso hasta que el navegador ya ha pintado, y quien tenga el movimiento
 * reducido no las descarga en absoluto.
 */
export async function initScrollLayer(): Promise<ScrollLayer> {
  // Con movimiento reducido no se carga NADA: ni Lenis ni GSAP. El navegador
  // hace su scroll nativo, que es instantáneo y es lo que se ha pedido.
  if (prefersReducedMotion()) {
    return {
      scrollTo: (target) => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        el?.scrollIntoView({ behavior: 'auto', block: 'start' });
      },
      destroy: () => {},
      gsap: null,
      ScrollTrigger: null,
    };
  }

  const [{ default: Lenis }, { gsap }, { ScrollTrigger }, { CustomEase }] = await Promise.all([
    import('lenis'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('gsap/CustomEase'),
  ]);

  gsap.registerPlugin(ScrollTrigger, CustomEase);
  // Deja las curvas de marca disponibles como `fm-out` / `fm-in` / `fm-spring`
  // dentro de cualquier línea de tiempo. Sin esto habría que escribir
  // `power2.out`, que no es la curva de este producto.
  registerGsapEases(CustomEase);

  const t = motionTokens();

  const lenis = new Lenis({
    // Un roce corto: 0,9 s de inercia. Por encima de ~1,2 s el usuario nota que
    // la página «sigue andando sola» y pierde la sensación de control, que en
    // una herramienta de decisión es lo último que queremos regalar.
    duration: 0.9,
    // Curva exponencial de salida: arranca con el gesto y frena largo, el mismo
    // carácter que `--ease-out` pero extendido al recorrido de una pantalla.
    easing: (x: number) => 1 - Math.pow(1 - x, 3),
    // El scroll táctil NO se suaviza: el dedo ya lleva su propia inercia y
    // duplicarla se siente resbaladizo.
    smoothWheel: true,
    syncTouch: false,
  });

  // ── El único bucle ───────────────────────────────────────────────────────
  // ScrollTrigger se actualiza desde el evento de Lenis, y Lenis avanza desde
  // el ticker de GSAP. Un solo `requestAnimationFrame` en toda la página.
  lenis.on('scroll', ScrollTrigger.update);

  const tick = (time: number) => lenis.raf(time * 1000); // GSAP da segundos
  gsap.ticker.add(tick);
  // El «suavizado de retraso» de GSAP congela la línea de tiempo cuando un
  // frame tarda demasiado. Con el scroll enganchado al ticker, eso congelaría
  // el propio scroll: se desactiva.
  gsap.ticker.lagSmoothing(0);

  const layer: ScrollLayer = {
    scrollTo: (target) => {
      lenis.scrollTo(target, { offset: -STICKY_HEADER, duration: t.sec.page * 2 });
    },
    destroy: () => {
      stopWatching();
      gsap.ticker.remove(tick);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      lenis.destroy();
    },
    gsap,
    ScrollTrigger,
  };

  // Si el usuario activa la preferencia con la página abierta, la capa se
  // desmonta en caliente en lugar de esperar a una recarga.
  const stopWatching = watchAndTeardown(() => layer.destroy());

  return layer;
}

function watchAndTeardown(teardown: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => {
    if (e.matches) teardown();
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/**
 * Enlaces internos de la página.
 *
 * Con Lenis montado, un `href="#seccion"` haría el salto nativo y se comería la
 * inercia; además la cabecera pegajosa taparía el título de destino. Aquí se
 * intercepta el clic para bajar con la misma inercia que el resto de la página
 * y con el desfase de la cabecera ya descontado.
 *
 * El foco se traslada al destino a mano: sin esto, quien navegue con teclado
 * seguiría en el enlace y el siguiente tabulador volvería a la cabecera.
 */
export function bindAnchorScroll(layer: ScrollLayer, root: ParentNode = document): () => void {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));

  const onClick = (event: MouseEvent) => {
    const link = event.currentTarget as HTMLAnchorElement;
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector<HTMLElement>(id);
    if (!target) return;

    event.preventDefault();
    layer.scrollTo(target);
    // La URL sigue reflejando dónde está el usuario, sin provocar el salto.
    history.replaceState(null, '', id);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };

  links.forEach((link) => link.addEventListener('click', onClick));
  return () => links.forEach((link) => link.removeEventListener('click', onClick));
}

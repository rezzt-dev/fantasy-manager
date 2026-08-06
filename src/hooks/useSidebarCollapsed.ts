'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'fantasy-sidebar-collapsed';

// Store compartido a nivel de módulo (mismo patrón que useDensity): Header,
// Sidebar y AppLayout leen y escriben el mismo valor, así el botón de plegar
// se propaga a toda la app al instante y persiste entre sesiones.
let current = false;
const listeners = new Set<() => void>();

function setCollapsed(value: boolean) {
  if (value === current) return;
  current = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // localStorage no disponible (modo privado estricto, etc.)
  }
  listeners.forEach((listener) => listener());
}

// Inicialización única en el cliente: restaura la preferencia guardada antes
// del primer render de cualquier componente.
if (typeof window !== 'undefined') {
  try {
    current = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    current = false;
  }

  // Sincroniza el estado de la sidebar entre pestañas abiertas del navegador.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      setCollapsed(event.newValue === '1');
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

function getServerSnapshot() {
  return false;
}

export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback((value: boolean) => {
    setCollapsed(value);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!current);
  }, []);

  return { collapsed, setCollapsed: set, toggleCollapsed: toggle };
}

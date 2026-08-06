'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'fantasy-density';
const DENSE_CLASS = 'density-dense';

// Store compartido a nivel de módulo: todas las llamadas a useDensity()
// (DashboardContainer, TeamTab, DataTable…) leen y escriben el mismo valor,
// así el toggle del header se propaga a toda la app al instante.
let current = false;
const listeners = new Set<() => void>();

function applyDenseClass(dense: boolean) {
  document.documentElement.classList.toggle(DENSE_CLASS, dense);
}

function setDensity(value: boolean) {
  if (value === current) return;
  current = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'dense' : 'comfortable');
  } catch {
    // localStorage no disponible (modo privado estricto, etc.)
  }
  applyDenseClass(value);
  listeners.forEach((listener) => listener());
}

// Inicialización única en el cliente: restaura la preferencia guardada y
// aplica la clase ANTES del primer render de cualquier componente.
if (typeof window !== 'undefined') {
  try {
    current = localStorage.getItem(STORAGE_KEY) === 'dense';
  } catch {
    current = false;
  }
  applyDenseClass(current);

  // Sincroniza el modo compacto entre pestañas abiertas del navegador.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      setDensity(event.newValue === 'dense');
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

export function useDensity() {
  const dense = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setDense = useCallback((value: boolean) => {
    setDensity(value);
  }, []);

  const toggleDense = useCallback(() => {
    setDensity(!current);
  }, []);

  return { dense, setDense, toggleDense };
}

'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'fantasy-read-notifications';

// Store compartido a nivel de módulo: cualquier componente que marque una
// notificación como leída la oculta en toda la app al instante y persiste
// la decisión entre sesiones.
let current = new Set<string>();
const listeners = new Set<() => void>();

function readStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function writeStorage(value: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(value)));
  } catch {
    // localStorage no disponible (modo privado estricto, etc.)
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function markAsRead(id: string) {
  if (current.has(id)) return;
  current = new Set(current);
  current.add(id);
  writeStorage(current);
  notify();
}

function markAllAsRead(ids: Iterable<string>) {
  const next = new Set(current);
  let changed = false;
  for (const id of ids) {
    if (!next.has(id)) {
      next.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  current = next;
  writeStorage(current);
  notify();
}

function resetAllRead() {
  if (current.size === 0) return;
  current = new Set();
  writeStorage(current);
  notify();
}

// Inicialización única en el cliente: restaura las notificaciones leídas
// antes del primer render de cualquier componente.
if (typeof window !== 'undefined') {
  current = readStorage();

  // Sincroniza el estado entre pestañas abiertas del navegador.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      current = readStorage();
      notify();
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
  return new Set<string>();
}

export function useNotifications() {
  const readIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

  const markRead = useCallback((id: string) => {
    markAsRead(id);
  }, []);

  const markAllRead = useCallback((ids: Iterable<string>) => {
    markAllAsRead(ids);
  }, []);

  const resetAll = useCallback(() => {
    resetAllRead();
  }, []);

  return { readIds, isRead, markAsRead: markRead, markAllAsRead: markAllRead, resetAll };
}

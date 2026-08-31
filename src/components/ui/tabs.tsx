'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

const Tabs = TabsPrimitive.Root;

/**
 * Dos formas, un solo comportamiento:
 *
 *   segmented → conmutador de vista dentro de un panel (pocas opciones,
 *               excluyentes, del mismo peso). Es el valor por defecto.
 *   underline → navegación de sección, cuando las pestañas encabezan la
 *               pantalla y compiten con el título: el subrayado pesa menos que
 *               una píldora y deja el protagonismo al contenido.
 *
 * En ambos casos la pestaña activa se marca con posición + peso + color, nunca
 * solo con color (regla nav-state-active).
 */
const listVariants = {
  segmented:
    'inline-flex h-10 items-center gap-1 rounded-lg border border-white/[0.09] bg-surface-raised p-1',
  underline:
    'inline-flex h-11 items-center gap-1 border-b border-white/[0.09] w-full overflow-x-auto no-scrollbar',
} as const;

const triggerVariants = {
  segmented: [
    'relative inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3',
    'text-sm font-medium text-content-tertiary',
    'transition-colors duration-fast ease-out',
    'hover:text-content',
    'disabled:pointer-events-none disabled:opacity-40',
    'data-[state=active]:bg-surface-overlay data-[state=active]:text-content data-[state=active]:shadow-1',
  ].join(' '),
  underline: [
    'relative inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap px-3',
    'text-sm font-medium text-content-tertiary',
    'transition-colors duration-fast ease-out',
    'hover:text-content',
    'disabled:pointer-events-none disabled:opacity-40',
    'data-[state=active]:text-content data-[state=active]:font-semibold',
    'after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-transparent after:content-[""]',
    'data-[state=active]:after:bg-accent',
  ].join(' '),
} as const;

type TabsVariant = keyof typeof listVariants;

const TabsVariantContext = React.createContext<TabsVariant>('segmented');

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: TabsVariant }
>(({ className, variant = 'segmented', ...props }, ref) => (
  <TabsVariantContext.Provider value={variant}>
    <TabsPrimitive.List ref={ref} className={cn(listVariants[variant], className)} {...props} />
  </TabsVariantContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return <TabsPrimitive.Trigger ref={ref} className={cn(triggerVariants[variant], className)} {...props} />;
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-4', className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

import type { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  );
}

// Screen names and their parameters. Owned by the main session.

import type { Id } from '../lib/types';

export type Route =
  | { name: 'home' }
  | { name: 'recognize' }
  | { name: 'album' }
  | { name: 'voice' }
  | { name: 'people' }
  | { name: 'person'; personId: Id }
  /** editId set = edit that person; missing = add a new person. */
  | { name: 'addPerson'; editId?: Id }
  | { name: 'settings' }
  /** Set or change the caregiver PIN. */
  | { name: 'pin' }
  | { name: 'help' };

export type RouteName = Route['name'];

export const HOME: Route = { name: 'home' };

/** Screens for the caregiver only. With a PIN set, they open after the PIN is entered. */
const CAREGIVER_SCREENS: ReadonlySet<RouteName> = new Set(['people', 'person', 'addPerson', 'settings', 'pin']);

export function isCaregiverRoute(route: Route): boolean {
  return CAREGIVER_SCREENS.has(route.name);
}

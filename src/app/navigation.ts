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
  | { name: 'help' };

export type RouteName = Route['name'];

export const HOME: Route = { name: 'home' };

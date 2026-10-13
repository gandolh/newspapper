/**
 * The sign-in hooks, configured. Import them from here, never from the vendored
 * bundle directly, so `configureAuth` has always run before the first hook.
 *
 * The plugin's routes live under the API prefix as the browser sees it:
 * `<base>/api/auth/...`, which the dev server and Caddy both strip down to
 * `/api/auth/...` before Fastify. `withBase` is the one place that prefix is
 * applied, as for every other call (see `lib/base.ts`).
 *
 * The library reads `?ward_error=` and `?ward=` off the address bar here, once,
 * at import, and removes them, which is why this runs at startup rather than on
 * the login page's first render.
 */
import { configureAuth } from '../../vendor/ward/ward-auth-react.js';
import { withBase } from './base';

configureAuth({ basePath: withBase('/api/auth') });

export {
  useChangePassword,
  useLogin,
  useLogout,
  useSession,
  useSetLocalPassword,
  useWardLink,
  useWardSignIn,
  useWardSignOut,
  useWardUnlink,
} from '../../vendor/ward/ward-auth-react.js';
export type { AuthError } from '../../vendor/ward/ward-auth-react.js';

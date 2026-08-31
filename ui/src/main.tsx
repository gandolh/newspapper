import { createRoot } from 'react-dom/client';
import Routes from './routes';
import './styles/global.css';

/**
 * The single entry point. Astro mounted five separate `client:load` islands
 * behind five static shells; this mounts the whole app once, which is what
 * keeps the tray alive across a navigation.
 *
 * No `<StrictMode>`: the islands were never double-invoked under Astro and
 * turning that on here would be a behaviour change smuggled into a transport
 * change. It is worth doing on its own, once the effects it would flag are
 * settled.
 */
const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

createRoot(root).render(<Routes />);

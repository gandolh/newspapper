import type { FastifyPluginAsync } from 'fastify';

/**
 * `GET /api/me` — who the browser is, as newspapper sees it.
 *
 * ## Why newspapper has this rather than the UI calling Ward
 *
 * Ward publishes `GET /ward-api/session`, and the tray could call it directly.
 * It should not: Ward answers with the **whole estate's** grant map, and the
 * browser has no business receiving this person's atrium and prm roles in order
 * to render a username in a sidebar. This route answers narrowly, and the grant
 * map does not leave the server.
 *
 * ## It is guarded, unlike prm's equivalent
 *
 * `/api/*` is gated as a whole here, so an unauthenticated caller never reaches
 * this handler — the guard answers 401 first, and the UI's fetch wrapper turns
 * that into the redirect to Ward. That is the right shape for newspapper, which
 * has no public surface at all, and it is why the handler can assume
 * `request.ward` is set.
 *
 * prm's `/api/me` deliberately does the opposite and never 401s, because
 * anonymous is the ordinary case on a public map. Two apps, two correct
 * answers, for the same route name.
 */
const meRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/me', async (req, reply) => {
    // Per-person and must not be cached anywhere in the chain.
    reply.header('cache-control', 'no-store');

    // The guard has already refused anyone without a live session and a
    // `newspapper` grant, so this is set. Asserted rather than branched on:
    // a null here would mean the guard did not run, which is a bug worth a
    // 500 rather than an answer that looks like a signed-out user.
    const ward = req.ward!;

    return {
      user: {
        subject: ward.subject,
        username: ward.username,
      },
    };
  });
};

export default meRoutes;

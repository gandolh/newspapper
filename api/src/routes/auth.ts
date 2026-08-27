import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { findUserByUsername, setUserPassword } from '@newspapper/core';
import type { User } from '@newspapper/core';
import { db } from '../lib/db.js';
import {
  MIN_PASSWORD_LENGTH,
  dummyPasswordHash,
  hashPassword,
  verifyPassword,
} from '../auth/password.js';
import { getSessionSecret } from '../auth/secret.js';
import {
  clearedSessionCookie,
  createSessionToken,
  sessionCookie,
  shouldUseSecureCookie,
} from '../auth/session.js';
import { checkLoginAttempt, clearLoginAttempts, recordLoginFailure } from '../auth/rateLimit.js';

const INVALID_CREDENTIALS = 'Invalid username or password';

function secureFor(req: FastifyRequest): boolean {
  return shouldUseSecureCookie(req.protocol, req.headers.host);
}

function issueSession(req: FastifyRequest, reply: FastifyReply, userId: number): void {
  const { token } = createSessionToken(userId, getSessionSecret());
  reply.header('Set-Cookie', sessionCookie(token, secureFor(req)));
}

function publicUser(user: User): User {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/login — { username, password }
   */
  fastify.post('/api/login', { config: { public: true } }, async (req, reply) => {
    const body = req.body as { username?: unknown; password?: unknown } | null;
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const verdict = checkLoginAttempt(req.ip);
    if (!verdict.allowed) {
      return reply
        .header('Retry-After', String(verdict.retryAfterSeconds))
        .status(429)
        .send({
          error: 'Too many failed sign-in attempts. Try again shortly.',
          retryAfterSeconds: verdict.retryAfterSeconds,
        });
    }

    const record = username ? findUserByUsername(db(), username) : undefined;
    const against = record?.passwordHash ?? (await dummyPasswordHash());
    const matched = await verifyPassword(password, against);

    if (!record || !matched) {
      const after = recordLoginFailure(req.ip);
      if (!after.allowed) {
        return reply
          .header('Retry-After', String(after.retryAfterSeconds))
          .status(429)
          .send({
            error: 'Too many failed sign-in attempts. Try again shortly.',
            retryAfterSeconds: after.retryAfterSeconds,
          });
      }
      return reply.status(401).send({ error: INVALID_CREDENTIALS });
    }

    clearLoginAttempts(req.ip);
    issueSession(req, reply, record.id);
    return reply.send({ user: publicUser(record) });
  });

  /**
   * POST /api/logout
   */
  fastify.post('/api/logout', { config: { public: true } }, async (req, reply) => {
    return reply
      .header('Set-Cookie', clearedSessionCookie(secureFor(req)))
      .send({ ok: true });
  });

  /**
   * GET /api/me — 401 when there is no valid session.
   */
  fastify.get('/api/me', async (req, reply) => {
    return reply.send({ user: req.user === null ? null : publicUser(req.user) });
  });

  /**
   * POST /api/password — { currentPassword, newPassword }
   */
  fastify.post('/api/password', async (req, reply) => {
    const current = req.user;
    if (!current) return reply.status(401).send({ error: 'Authentication required' });

    const body = req.body as { currentPassword?: unknown; newPassword?: unknown } | null;
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return reply
        .status(400)
        .send({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const record = findUserByUsername(db(), current.username);
    if (!record || !(await verifyPassword(currentPassword, record.passwordHash))) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    setUserPassword(db(), record.id, await hashPassword(newPassword));
    issueSession(req, reply, record.id);
    return reply.send({ ok: true });
  });
};

export default authRoutes;

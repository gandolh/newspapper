/**
 * Brief 89. The real Ward client, the code that decides who is authenticated
 * in production. Until this file every test used `createFakeWard()`, which never
 * verifies a signature or makes the introspection call.
 *
 * No network: one fake `fetch` answers both Ward endpoints. jose fetches the
 * JWKS through the global `fetch`, so the fake is stubbed globally as well as
 * passed in as the client's own `fetch` (introspection).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SignJWT, exportJWK, exportSPKI, generateKeyPair, type JWK, type CryptoKey } from 'jose';

import { createWardClient, type WardClientOptions } from './ward.client.js';
import {
  ACCESS_TOKEN_AUDIENCE,
  APP_KEY_HEADER,
  WardAuthenticationError,
  WardConfigurationError,
  WardUnavailableError,
} from './ward.types.js';

const ORIGIN = 'https://ward.test';
const BASE = '/ward-api';
const JWKS_URL = `${ORIGIN}${BASE}/.well-known/jwks.json`;
const INTROSPECT_URL = `${ORIGIN}${BASE}/introspect`;
const KID = 'test-key-1';

let privateKey: CryptoKey;
let publicJwk: JWK;
let publicPem: string;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true });
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: KID, alg: 'EdDSA', use: 'sig' };
  publicPem = await exportSPKI(pair.publicKey);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

interface Ward {
  calls: { url: string; init?: RequestInit }[];
  introspect: () => Response;
  jwks: () => Response;
}

/** A Ward double behind `fetch`, and a real client pointed at it. */
function setup(overrides: Partial<WardClientOptions> = {}) {
  const ward: Ward = {
    calls: [],
    introspect: () =>
      Response.json({
        active: true,
        subject: 'sub-1',
        username: 'ana',
        grants: { newspapper: ['editor'] },
      }),
    jwks: () => Response.json({ keys: [publicJwk] }),
  };
  const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    ward.calls.push({ url, init });
    if (url === JWKS_URL) return ward.jwks();
    if (url === INTROSPECT_URL) return ward.introspect();
    throw new Error(`unexpected fetch ${url}`);
  }) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fake);
  const client = createWardClient({
    publicOrigin: ORIGIN,
    apiBasePath: BASE,
    appKey: 'wak_test',
    fetch: fake,
    ...overrides,
  });
  const introspections = () => ward.calls.filter((c) => c.url === INTROSPECT_URL);
  return { client, ward, introspections };
}

async function token(
  claims: Record<string, unknown> = {},
  opts: { key?: CryptoKey; kid?: string; expiresIn?: string | number } = {},
): Promise<string> {
  const jwt = new SignJWT({ jti: 'jti-1', sid: 'sid-1', ...claims })
    .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: opts.kid ?? KID })
    .setSubject('sub-1')
    .setIssuer((claims['iss'] as string | undefined) ?? ORIGIN)
    .setAudience((claims['aud'] as string | undefined) ?? ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '5m');
  return jwt.sign(opts.key ?? privateKey);
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

describe('verify: the signature and claims checks', () => {
  it('accepts a valid token', async () => {
    const { client } = setup();
    const claims = await client.verify(await token());
    expect(claims.sub).toBe('sub-1');
    expect(claims.sid).toBe('sid-1');
  });

  it('rejects alg:none', async () => {
    const { client } = setup();
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64({ alg: 'none', typ: 'JWT', kid: KID })}.${b64({
      sub: 'sub-1',
      jti: 'j',
      sid: 's',
      iat: now,
      exp: now + 300,
      iss: ORIGIN,
      aud: ACCESS_TOKEN_AUDIENCE,
    })}.`;
    await expect(client.verify(unsigned)).rejects.toBeInstanceOf(WardAuthenticationError);
  });

  it('rejects HS256 signed with the public key as the secret (alg confusion)', async () => {
    const { client } = setup();
    const forged = await new SignJWT({ jti: 'j', sid: 's' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT', kid: KID })
      .setSubject('sub-1')
      .setIssuer(ORIGIN)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(publicPem));
    await expect(client.verify(forged)).rejects.toBeInstanceOf(WardAuthenticationError);
  });

  // The algorithm pin's own job. jose already refuses alg:none, and an HS256
  // header matches no Ed25519 key, so those two cases hold even without the pin.
  // What only the pin stops is a token in another algorithm whose key is also in
  // the set: here an ES256 key published beside Ward's Ed25519 one.
  it('rejects a token in another algorithm even when its key is published', async () => {
    const { client, ward } = setup();
    const es = await generateKeyPair('ES256', { extractable: true });
    const esJwk = { ...(await exportJWK(es.publicKey)), kid: 'es-key', alg: 'ES256' };
    ward.jwks = () => Response.json({ keys: [publicJwk, esJwk] });
    const other = await new SignJWT({ jti: 'j', sid: 's' })
      .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid: 'es-key' })
      .setSubject('sub-1')
      .setIssuer(ORIGIN)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(es.privateKey);
    await expect(client.verify(other)).rejects.toBeInstanceOf(WardAuthenticationError);
  });

  it('rejects an expired token', async () => {
    const { client } = setup();
    const expired = await token({}, { expiresIn: Math.floor(Date.now() / 1000) - 60 });
    await expect(client.verify(expired)).rejects.toBeInstanceOf(WardAuthenticationError);
  });

  it('rejects the wrong issuer', async () => {
    const { client } = setup();
    await expect(client.verify(await token({ iss: 'https://evil.test' }))).rejects.toBeInstanceOf(
      WardAuthenticationError,
    );
  });

  it('rejects the wrong audience', async () => {
    const { client } = setup();
    await expect(client.verify(await token({ aud: 'some-other-app' }))).rejects.toBeInstanceOf(
      WardAuthenticationError,
    );
  });

  it('rejects a token missing a required claim (sid)', async () => {
    const { client } = setup();
    await expect(client.verify(await token({ sid: undefined }))).rejects.toBeInstanceOf(
      WardAuthenticationError,
    );
  });

  it('rejects a token signed by a key Ward does not publish', async () => {
    const { client } = setup();
    const other = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    await expect(
      client.verify(await token({}, { key: other.privateKey, kid: 'unknown-kid' })),
    ).rejects.toBeInstanceOf(WardAuthenticationError);
  });

  // KNOWN BUG, filed as brief 104: `verify` wraps every jose error, a failed
  // JWKS fetch included, as WardAuthenticationError, so a Ward outage at the
  // key endpoint answers 401 ("signed out") instead of failing closed with 503.
  // `it.fails` documents it; when the client is fixed this flips and must
  // become a plain `it`.
  it.fails('a JWKS outage is unavailable (503), not unauthenticated (401)', async () => {
    const { client, ward } = setup();
    ward.jwks = () => new Response('down', { status: 500 });
    await expect(client.verify(await token())).rejects.toBeInstanceOf(WardUnavailableError);
  });
});

describe('introspect: liveness, and failing closed', () => {
  it('maps an active session to a caller, and sends the app key', async () => {
    const { client, introspections } = setup();
    expect(await client.introspect('tok')).toEqual({
      active: true,
      subject: 'sub-1',
      username: 'ana',
      grants: { newspapper: ['editor'] },
    });
    const headers = introspections()[0]!.init!.headers as Record<string, string>;
    expect(headers[APP_KEY_HEADER]).toBe('wak_test');
    expect(JSON.parse(String(introspections()[0]!.init!.body))).toEqual({ accessToken: 'tok' });
  });

  it('{active:false} is inactive, and authenticate refuses it as unauthenticated', async () => {
    const { client, ward } = setup();
    ward.introspect = () => Response.json({ active: false });
    expect(await client.introspect('tok')).toEqual({ active: false });
    await expect(client.authenticate(`ward_session=${await token()}`)).rejects.toBeInstanceOf(
      WardAuthenticationError,
    );
  });

  it('HTTP 500 is unavailable, never inactive', async () => {
    const { client, ward } = setup();
    ward.introspect = () => new Response('boom', { status: 500 });
    const err = await client.introspect('tok').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WardUnavailableError);
    expect(err).not.toBeInstanceOf(WardConfigurationError);
  });

  it('HTTP 401 is a configuration error: the app key was refused', async () => {
    const { client, ward } = setup();
    ward.introspect = () => new Response('no', { status: 401 });
    await expect(client.introspect('tok')).rejects.toBeInstanceOf(WardConfigurationError);
  });

  it('malformed JSON and an off-contract body are unavailable', async () => {
    const { client, ward } = setup();
    ward.introspect = () => new Response('{not json', { status: 200 });
    await expect(client.introspect('a')).rejects.toBeInstanceOf(WardUnavailableError);
    ward.introspect = () => Response.json({ active: 'yes' });
    await expect(client.introspect('b')).rejects.toBeInstanceOf(WardUnavailableError);
    ward.introspect = () => Response.json({ active: true });
    await expect(client.introspect('c')).rejects.toBeInstanceOf(WardUnavailableError);
  });

  it('a network failure is unavailable', async () => {
    const { client, ward } = setup();
    ward.introspect = () => {
      throw new TypeError('fetch failed');
    };
    await expect(client.introspect('tok')).rejects.toBeInstanceOf(WardUnavailableError);
  });
});

describe('introspect: the per-token cache', () => {
  it('serves a repeat within the TTL from cache, and re-fetches after it', async () => {
    let clock = 1_000_000;
    const { client, introspections } = setup({ now: () => clock });
    await client.introspect('tok');
    clock += 29_000;
    await client.introspect('tok');
    expect(introspections()).toHaveLength(1);
    clock += 2_000; // past 30 s
    await client.introspect('tok');
    expect(introspections()).toHaveLength(2);
  });

  it('caches per token, not per subject', async () => {
    const { client, introspections } = setup();
    await client.introspect('tok-a');
    await client.introspect('tok-b');
    expect(introspections()).toHaveLength(2);
  });

  it('collapses concurrent calls on a cold token into one request', async () => {
    const { client, introspections } = setup();
    await Promise.all([
      client.introspect('tok'),
      client.introspect('tok'),
      client.introspect('tok'),
    ]);
    expect(introspections()).toHaveLength(1);
  });
});

describe('authenticate: cookie to caller', () => {
  it('a valid cookie yields the caller with its sid', async () => {
    const { client } = setup();
    const caller = await client.authenticate(`other=1; ward_session=${await token()}`);
    expect(caller).toMatchObject({ active: true, subject: 'sub-1', sid: 'sid-1' });
  });

  it('no cookie, or an empty one, is unauthenticated without asking Ward', async () => {
    const { client, introspections } = setup();
    await expect(client.authenticate(undefined)).rejects.toBeInstanceOf(WardAuthenticationError);
    await expect(client.authenticate('ward_session=')).rejects.toBeInstanceOf(
      WardAuthenticationError,
    );
    expect(introspections()).toHaveLength(0);
  });

  it('a forged token is refused before Ward is asked anything', async () => {
    const { client, introspections } = setup();
    const other = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const forged = await token({}, { key: other.privateKey });
    await expect(client.authenticate(`ward_session=${forged}`)).rejects.toBeInstanceOf(
      WardAuthenticationError,
    );
    expect(introspections()).toHaveLength(0);
  });
});

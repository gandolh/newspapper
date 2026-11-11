import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig, loadSeedConfig, resolveDbPath } from "./config.js";

const WARD = {
  WARD_OIDC_ISSUER: "http://localhost:8792/ward-api/oidc",
  WARD_OIDC_CLIENT_ID: "newspapper",
  WARD_OIDC_CLIENT_KEY: "a-key",
  WARD_OIDC_REDIRECT_URI: "https://example.com/newspapper/api/auth/ward/callback",
};

describe("loadConfig", () => {
  it("fills the defaults, and treats an empty value as unset", () => {
    expect(loadConfig({ PORT: "", READER_REFRESH_MINUTES: " ", AUTH_TRUSTED_PROXIES: "" })).toEqual({
      port: 3001,
      readerRefreshMinutes: 30,
      trustedProxies: [],
      auth: {
        paths: {
          base: "",
          cookiePath: "/",
          loginPath: "/login",
          settingsPath: "/settings",
          afterSignInPath: "/",
        },
        publicOrigin: "http://localhost:4321",
        ward: undefined,
      },
    });
  });

  it("parses the port, the refresh interval, the proxy list and the Ward set", () => {
    const config = loadConfig({
      PORT: "3101",
      READER_REFRESH_MINUTES: "0",
      AUTH_TRUSTED_PROXIES: "172.16.0.0/12, 10.0.0.0/8,",
      ...WARD,
    });
    expect(config.port).toBe(3101);
    expect(config.readerRefreshMinutes).toBe(0);
    expect(config.trustedProxies).toEqual(["172.16.0.0/12", "10.0.0.0/8"]);
    expect(config.auth.ward).toMatchObject({ issuer: WARD.WARD_OIDC_ISSUER, clientId: "newspapper" });
    // No NEWSPAPPER_BASE: the base and the origin are read back out of the callback.
    expect(config.auth.paths.base).toBe("/newspapper");
    expect(config.auth.publicOrigin).toBe("https://example.com");
  });

  it("throws once, naming every bad variable", () => {
    const bad = {
      PORT: "abc",
      READER_REFRESH_MINUTES: "-5",
      AUTH_TRUSTED_PROXIES: "not-an-address",
      WARD_OIDC_ISSUER: WARD.WARD_OIDC_ISSUER,
    };
    expect(() => loadConfig(bad)).toThrow(ConfigError);
    try {
      loadConfig(bad);
    } catch (error) {
      const message = String(error);
      expect(message).toMatch(/PORT/);
      expect(message).toMatch(/READER_REFRESH_MINUTES/);
      expect(message).toMatch(/AUTH_TRUSTED_PROXIES/);
      expect(message).toMatch(/WARD_OIDC_CLIENT_ID, WARD_OIDC_CLIENT_KEY, WARD_OIDC_REDIRECT_URI/);
    }
  });

  it("refuses a port out of range", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrow(/PORT/);
  });
});

describe("loadSeedConfig and resolveDbPath", () => {
  it("hand the seed command and the database their variables as given", () => {
    expect(loadSeedConfig({ SEED_USERNAME: "tester", SEED_PASSWORD: "pw", PORT: "1" })).toEqual({
      SEED_USERNAME: "tester",
      SEED_PASSWORD: "pw",
      SEED_ROLE: undefined,
    });
    expect(resolveDbPath({ NEWSPAPPER_DB_PATH: "/srv/data/newspapper.db" })).toBe("/srv/data/newspapper.db");
    expect(resolveDbPath({})).toBeUndefined();
  });
});

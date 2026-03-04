import { describe, expect, it } from "vitest";
import { setDefaultSecurityHeaders } from "./http-common.js";
import { makeMockHttpResponse } from "./test-http-response.js";

describe("setDefaultSecurityHeaders", () => {
  it("sets baseline security headers", () => {
    const { res, setHeader } = makeMockHttpResponse();
    setDefaultSecurityHeaders(res);

    expect(setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(setHeader).toHaveBeenCalledWith("Referrer-Policy", "no-referrer");
    expect(setHeader).toHaveBeenCalledWith(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    );
  });
});

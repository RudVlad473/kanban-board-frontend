import { describe, expect, it } from "vitest";

import { COOKIE } from "@/lib/core/cookies/cookie-registry";

import { upstreamCookie } from "./upstream-cookie";

const responseWithSetCookies = (setCookiePairs: string[]): Response => {
    const response = new Response(null);
    for (const pair of setCookiePairs) {
        response.headers.append("Set-Cookie", pair);
    }
    return response;
};

describe("upstreamCookie.extract", () => {
    it("reads the value out of a single matching Set-Cookie pair", () => {
        // Arrange
        const response = responseWithSetCookies(["JSESSIONID=abc123; Path=/; HttpOnly; SameSite=Strict"]);

        // Act
        const result = upstreamCookie.extract(response);

        // Assert
        expect(result).toBe("abc123");
    });

    it("finds the matching pair among several Set-Cookie headers", () => {
        // Arrange
        const response = responseWithSetCookies([
            "OTHER_COOKIE=irrelevant; Path=/",
            "JSESSIONID=xyz789; Path=/; HttpOnly; SameSite=Strict",
            "ANOTHER_ONE=also-irrelevant; Path=/",
        ]);

        // Act
        const result = upstreamCookie.extract(response);

        // Assert
        expect(result).toBe("xyz789");
    });

    it("reads the value correctly even though its own Expires attribute contains a comma", () => {
        // Arrange
        const response = responseWithSetCookies([
            "JSESSIONID=commatest; Max-Age=600; Expires=Tue, 18 Aug 2026 19:15:56 GMT; Path=/; HttpOnly; SameSite=Strict",
        ]);

        // Act
        const result = upstreamCookie.extract(response);

        // Assert
        expect(result).toBe("commatest");
    });

    it("skips a malformed pair with no '=' separator rather than throwing", () => {
        // Arrange
        const response = responseWithSetCookies(["malformed-no-equals-sign", "JSESSIONID=recovered; Path=/"]);

        // Act
        const result = upstreamCookie.extract(response);

        // Assert
        expect(result).toBe("recovered");
    });

    const noMatchCases = [
        { name: "no Set-Cookie headers at all", pairs: [] },
        { name: "Set-Cookie headers present but none named JSESSIONID", pairs: ["OTHER_COOKIE=value; Path=/"] },
    ];

    for (const { name, pairs } of noMatchCases) {
        it(`returns null when ${name}`, () => {
            // Arrange
            const response = responseWithSetCookies(pairs);

            // Act
            const result = upstreamCookie.extract(response);

            // Assert
            expect(result).toBeNull();
        });
    }
});

describe("upstreamCookie.toHeader", () => {
    it("builds the Cookie request-header value from the raw session id", () => {
        // Arrange
        const jsessionId = "some-session-id";

        // Act
        const header = upstreamCookie.toHeader(jsessionId);

        // Assert
        expect(header).toBe(`${COOKIE.UPSTREAM_SESSION}=some-session-id`);
    });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Cloudflare uses unindented paths followed by indented HTTP headers.
const source = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");
const rules = new Map(
  source
    .trim()
    .split(/\r?\n(?=\/)/)
    .map((block) => {
      const [path, ...lines] = block.split(/\r?\n/);
      const headers = new Headers();
      for (const line of lines.filter((line) => line.trim())) {
        const colon = line.indexOf(":");
        if (colon < 0) throw new Error(`Invalid header: ${line}`);
        headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
      }
      return [path, headers] as const;
    }),
);

describe("PWA privacy headers", () => {
  it("does not send page paths or query strings as cross-origin referrers", () => {
    expect(rules.get("/*")?.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("denies unused sensitive device capabilities without blocking speech playback or file selection", () => {
    const permissions = rules.get("/*")?.get("Permissions-Policy")?.split(/,\s*/);
    expect(permissions).toEqual([
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
    ]);
  });

  it("disables MIME sniffing", () => {
    expect(rules.get("/*")?.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it.each(["/sw.js", "/manifest.webmanifest", "/offline.html"])(
    "keeps %s revalidated so PWA updates are discoverable",
    (path) => expect(rules.get(path)?.get("Cache-Control")).toBe("no-cache"),
  );
});

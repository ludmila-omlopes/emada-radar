import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createTranslator } from "next-intl";
import { routing } from "../src/i18n/routing";
import { portalHref, stripLocale } from "../src/i18n/config";
import { localizeLeaderboard } from "../src/i18n/benchmarks";
import pt from "../src/i18n/messages/pt-BR.json";
import en from "../src/i18n/messages/en.json";

test("locale negotiation respects explicit URL, remembered choice, browser variant and fallback", () => {
  const middleware = createMiddleware(routing);
  const cases = [
    ["/skills", { "accept-language": "en-US" }, "/en/skills"],
    ["/formacao", { "accept-language": "en-US" }, "/en/formacao"],
    ["/noticias?source=OpenAI", { "accept-language": "en-US,en;q=0.9" }, "/en/noticias?source=OpenAI"],
    ["/", { "accept-language": "pt-PT,pt;q=0.9" }, "/pt-BR"],
    ["/", { "accept-language": "ja-JP" }, "/pt-BR"],
    ["/", { "accept-language": "en", cookie: "EMADA_LOCALE=pt-BR" }, "/pt-BR"],
    ["/", { "accept-language": "en", cookie: "EMADA_LOCALE=invalid" }, "/en"],
  ] as const;
  for (const [path, headers, expected] of cases) assert.equal(middleware(new NextRequest(`https://portal.example${path}`, { headers })).headers.get("location"), `https://portal.example${expected}`);
  const explicit = middleware(new NextRequest("https://portal.example/en/modelos", { headers: { cookie: "EMADA_LOCALE=pt-BR", "accept-language": "pt-BR" } }));
  assert.equal(explicit.headers.get("location"), null);
  assert.match(explicit.headers.get("link")!, /hreflang="pt-BR"/);
  assert.match(explicit.headers.get("set-cookie")!, /EMADA_LOCALE=en/);
});

test("portal links retain language and do not prefix Academy or authentication routes", () => {
  assert.equal(portalHref("en", "/skills"), "/en/skills");
  assert.equal(portalHref("pt-BR", "/en/skills"), "/pt-BR/skills");
  assert.equal(portalHref("en", "/formacao"), "/en/formacao");
  assert.equal(portalHref("en", "/modelos"), "/en/modelos");
  assert.equal(portalHref("pt-BR", "/en/vozes"), "/pt-BR/vozes");
  for (const path of ["/entrar?next=/progresso", "/modulos", "/api/auth/callback/google", "/aprender/primeiro-dia"]) assert.equal(portalHref("en", path), path);
  assert.equal(stripLocale("/english"), "/english");
});

test("catalogs have matching keys, valid plurals and localized benchmark descriptions", () => {
  function keys(value: object, prefix = ""): string[] { return Object.entries(value).flatMap(([k, v]) => typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]); }
  assert.deepEqual(keys(pt).sort(), keys(en).sort());
  const t = createTranslator({ locale: "en", messages: en, namespace: "Portal" });
  assert.equal(t("comments", { count: 1 }), "1 comment");
  assert.equal(t("comments", { count: 2 }), "2 comments");
  assert.equal(t("sourceCount", { available: 5, total: 5, kind: "buscas" }), "5/5 searches available");
  const b = createTranslator({ locale: "en", messages: en, namespace: "Benchmarks" });
  const board = localizeLeaderboard({ id: "livebench", name: "LiveBench", url: "", release: null, fetchedAt: null, status: "ok", models: [], metrics: [{ key: "Reasoning", label: "Raciocínio", description: "", unit: "score" }] }, key => b(key as Parameters<typeof b>[0]));
  assert.equal(board.metrics[0].label, "Reasoning");
  assert.match(board.metrics[0].description, /0 to 100/);
});

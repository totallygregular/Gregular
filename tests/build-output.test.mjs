import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { once } from "node:events";
import { createPreviewServer } from "../scripts/preview.mjs";
import { withPreviewLink } from "../scripts/build-support.mjs";

const root = resolve(".");
const dist = resolve(root, "dist");
let server;
let origin;

before(async () => {
  await readFile(resolve(dist, "companion/index.html"));
  server = createPreviewServer(dist).listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  );
});

test("optional tooltip sandbox assets resolve under the compiled companion path", async () => {
  const page = await fetch(origin + "/companion/tooltip-frame.html?provider=foreverdb&ids=6335");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  const html = await page.text();
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /src="\.\/tooltip-frame.js"/);
  const script = await fetch(origin + "/companion/tooltip-frame.js");
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /javascript/);
  assert.doesNotMatch(await script.text(), /localStorage|sessionStorage|parent\.document/);
});

test("combined output preserves original class draft and domain files", async () => {
  const originalIndex = await readFile(resolve(root, "index.html"), "utf8");
  assert.equal(
    await readFile(resolve(dist, "index.html"), "utf8"),
    withPreviewLink(originalIndex, process.env),
  );
  for (const name of ["CNAME", ".nojekyll"])
    assert.deepEqual(
      await readFile(resolve(dist, name)),
      await readFile(resolve(root, name)),
      name,
    );
  for (const name of await readdir(resolve(root, "assets")))
    assert.deepEqual(
      await readFile(resolve(dist, "assets", name)),
      await readFile(resolve(root, "assets", name)),
      name,
    );
});

test("only Cloudflare feature previews receive a companion link at the root", async () => {
  const original = await readFile(resolve(root, "index.html"), "utf8");
  for (const environment of [
    {},
    { CF_PAGES: "0", CF_PAGES_BRANCH: "codex/example" },
    { CF_PAGES: "1", CF_PAGES_BRANCH: "main" },
  ])
    assert.equal(withPreviewLink(original, environment), original);
  const preview = withPreviewLink(original, {
    CF_PAGES: "1",
    CF_PAGES_BRANCH: "codex/example",
  });
  assert.match(preview, /href="\/companion\/"/);
  assert.match(preview, /Open companion preview/);
  assert.equal(
    preview.replace(
      /<aside aria-label="Companion preview"[^>]*>.*?<\/aside>/,
      "",
    ),
    original,
  );
});

test("class draft and companion are separate static applications", async () => {
  const legacy = await fetch(origin + "/");
  const companion = await fetch(origin + "/companion/");
  assert.equal(legacy.status, 200);
  assert.equal(companion.status, 200);
  assert.match(companion.headers.get("content-type"), /text\/html/);
  assert.notEqual(await legacy.text(), await companion.text());
});

test("nested compiled script, style and icon URLs resolve with correct types", async () => {
  const html = await readFile(resolve(dist, "companion/index.html"), "utf8");
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(urls.some((url) => url.endsWith(".js")));
  assert.ok(urls.some((url) => url.endsWith(".css")));
  assert.ok(urls.some((url) => url.endsWith(".svg")));
  for (const url of urls) {
    assert.ok(url.startsWith("./"), `Expected relative asset: ${url}`);
    const response = await fetch(new URL(url, origin + "/companion/"));
    assert.equal(response.status, 200, url);
    const expectedType = url.endsWith(".js")
      ? "text/javascript"
      : url.endsWith(".css")
        ? "text/css"
        : "image/svg+xml";
    assert.ok(response.headers.get("content-type").startsWith(expectedType));
    assert.ok((await response.text()).length > 0);
  }
});

test("canonical companion URLs preserve queries without a redirect loop", async () => {
  for (const path of ["/companion", "/companion/index.html"])
    for (const search of ["", "?review=1"]) {
      const response = await fetch(origin + path + search, {
        redirect: "manual",
      });
      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), "/companion/" + search);
      const followed = await fetch(origin + path + search);
      assert.equal(followed.status, 200);
      assert.equal(new URL(followed.url).pathname, "/companion/");
    }
  const rules = await readFile(resolve(dist, "_redirects"), "utf8");
  assert.match(rules, /^\/companion \/companion\/ 308$/m);
  assert.match(rules, /^\/companion\/index\.html \/companion\/ 308$/m);
});

test("hash direct links and refresh requests use the companion document", async () => {
  const entry = await readFile(resolve(dist, "companion/index.html"), "utf8");
  const direct = origin + "/companion/#/character/example/leveling";
  assert.equal(await (await fetch(direct)).text(), entry);
  assert.equal(await (await fetch(direct)).text(), entry);
});

test("optional demo JSON is downloadable from the nested companion route", async () => {
  const response = await fetch(origin + "/companion/demo-profile-v2.json");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/json/);
  const profile = await response.json();
  assert.equal(profile.schemaVersion, 2);
  assert.equal(profile.username, "Gregular Demo");
  assert.ok(profile.characters.length >= 2);
});

test("missing assets and paths return 404 rather than class-draft HTML", async () => {
  for (const path of [
    "/companion/assets/missing.js",
    "/companion/missing",
    "/companion/src/App.tsx",
    "/package.json",
    "/.git/config",
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /Page not found/);
  }
  assert.match(
    await readFile(resolve(dist, "404.html"), "utf8"),
    /Page not found/,
  );
});

test("build publishes no source, tests, local saves or dependencies", async () => {
  const top = await readdir(dist);
  assert.deepEqual(
    top.sort(),
    [
      ".nojekyll",
      "404.html",
      "CNAME",
      "_redirects",
      "assets",
      "companion",
      "index.html",
    ].sort(),
  );
  const companion = await readdir(resolve(dist, "companion"));
  assert.ok(
    !companion.some((name) => ["src", "node_modules", ".env"].includes(name)),
  );
});

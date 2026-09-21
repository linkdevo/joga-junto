import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("player header shows logout when a browser session exists", () => {
  const source = readSource("components/player/Header/Header.tsx");

  assert.match(source, /["']use client["']/, "Header must read browser storage");
  assert.match(source, /getStoredUser/, "Header must inspect the saved user");
  assert.match(source, /getToken/, "Header must inspect the saved token");
  assert.match(source, /clearSession/, "Header logout must clear the session");
  assert.match(source, /Sair/, "Authenticated header action must be Sair");
});

test("player home opens an auth modal instead of redirecting anonymous athletes", () => {
  const source = readSource("components/player/PlayerResume/PlayerResume.tsx");

  assert.match(
    source,
    /if\s*\(\s*!token\s*\|\|\s*!user\s*\)\s*\{\s*setDashboard\(null\);\s*setIsLoading\(false\);\s*return;\s*\}/,
    "Anonymous athletes should stay on the player home page without redirecting",
  );
  assert.match(source, /authModal/, "Player home must render an auth modal");
  assert.match(source, /Fazer login/, "Modal must offer login");
  assert.match(source, /Criar conta/, "Modal must offer account creation");
});

test("signup page uses the polished two-column sports layout", () => {
  const source = readSource("app/cadastro/page.tsx");
  const cssPath = join(root, "app/cadastro/Cadastro.module.css");

  assert.match(
    source,
    /Cadastro\.module\.css/,
    "Signup page must use its dedicated CSS module",
  );
  assert.match(source, /styles\.page/, "Signup page must apply page layout");
  assert.match(source, /styles\.formPanel/, "Signup form must be in a panel");
  assert.match(
    source,
    /styles\.visualPanel/,
    "Signup page must include a right visual panel",
  );
  assert.match(
    source,
    /Crie sua conta de atleta/,
    "Signup page must have athlete-focused copy",
  );

  assert.equal(
    existsSync(cssPath),
    true,
    "Signup page styles must live in Cadastro.module.css",
  );

  const css = readFileSync(cssPath, "utf8");

  assert.match(
    css,
    /images\.unsplash\.com/,
    "Visual panel must use a sports-related image asset",
  );
  assert.match(
    css,
    /#00e991|#6ee96f/,
    "Signup page must keep the JogaJunto green palette",
  );
});

test("login page uses the same polished sports layout as signup", () => {
  const source = readSource("app/login/page.tsx");
  const cssPath = join(root, "app/cadastro/Cadastro.module.css");

  assert.match(
    source,
    /Cadastro\.module\.css/,
    "Login page must reuse the signup auth layout styles",
  );
  assert.match(source, /styles\.page/, "Login page must apply page layout");
  assert.match(source, /styles\.formPanel/, "Login form must be in a panel");
  assert.match(
    source,
    /styles\.visualPanel/,
    "Login page must include the matching visual panel",
  );
  assert.match(
    source,
    /Entre na sua conta de atleta/,
    "Login page must have athlete-focused return copy",
  );

  const css = readFileSync(cssPath, "utf8");

  assert.match(
    css,
    /images\.unsplash\.com/,
    "Shared visual panel must use a sports-related image asset",
  );
  assert.match(
    css,
    /#00e991|#6ee96f/,
    "Login page must keep the JogaJunto green palette",
  );
});

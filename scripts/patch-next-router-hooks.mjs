/**
 * Patch next@16.2.x App Router: extract RouterContent after useActionQueue
 * so suspending use()/thenables don't shift later hook slots
 * (https://github.com/vercel/next.js/issues/63121).
 */
import fs from "fs";
import path from "path";

const roots = [
  path.join("node_modules", "next", "dist", "client", "components", "app-router.js"),
  path.join(
    "node_modules",
    "next",
    "dist",
    "esm",
    "client",
    "components",
    "app-router.js"
  ),
];

for (const rel of roots) {
  const file = path.join(process.cwd(), rel);
  let s = fs.readFileSync(file, "utf8");
  if (s.includes("function RouterContent(")) {
    console.log("already patched:", rel);
    continue;
  }

  const isEsm = rel.includes(`${path.sep}esm${path.sep}`);
  const needle = isEsm
    ? `function Router({ actionQueue, globalError, webSocket, staticIndicatorState }) {
    const state = useActionQueue(actionQueue);
    const { canonicalUrl } = state;`
    : `function Router({ actionQueue, globalError, webSocket, staticIndicatorState }) {
    const state = (0, _useactionqueue.useActionQueue)(actionQueue);
    const { canonicalUrl } = state;`;

  const replacement = isEsm
    ? `function Router({ actionQueue, globalError, webSocket, staticIndicatorState }) {
    const state = useActionQueue(actionQueue);
    return /*#__PURE__*/ _jsx(RouterContent, {
        state: state,
        globalError: globalError,
        webSocket: webSocket,
        staticIndicatorState: staticIndicatorState
    });
}
function RouterContent({ state, globalError, webSocket, staticIndicatorState }) {
    const { canonicalUrl } = state;`
    : `function Router({ actionQueue, globalError, webSocket, staticIndicatorState }) {
    const state = (0, _useactionqueue.useActionQueue)(actionQueue);
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(RouterContent, {
        state: state,
        globalError: globalError,
        webSocket: webSocket,
        staticIndicatorState: staticIndicatorState
    });
}
function RouterContent({ state, globalError, webSocket, staticIndicatorState }) {
    const { canonicalUrl } = state;`;

  if (!s.includes(needle)) {
    console.error("pattern not found in", rel);
    process.exit(1);
  }
  fs.writeFileSync(file, s.replace(needle, replacement));
  console.log("patched:", rel);
}

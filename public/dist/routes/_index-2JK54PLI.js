import "/dist/_shared/chunk-HPZTA4M6.js";
import {
  createHotContext
} from "/dist/_shared/chunk-OGRXFJG7.js";
import {
  require_jsx_dev_runtime
} from "/dist/_shared/chunk-2WX3K56S.js";
import "/dist/_shared/chunk-XFPSG2E3.js";
import "/dist/_shared/chunk-IVDGPO5B.js";
import "/dist/_shared/chunk-BJ75YQCI.js";
import {
  __toESM
} from "/dist/_shared/chunk-R6HWJ6RV.js";

// app/routes/_index.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/_index.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/_index.tsx"
  );
  import.meta.hot.lastModified = "1737383946193.493";
}
var meta = () => {
  return [{
    title: "Standard Electric"
  }, {
    name: "description",
    content: "A game"
  }];
};
function Index() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: "Standard Electric" }, void 0, false, {
    fileName: "app/routes/_index.tsx",
    lineNumber: 48,
    columnNumber: 10
  }, this);
}
_c = Index;
var _c;
$RefreshReg$(_c, "Index");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Index as default,
  meta
};
//# sourceMappingURL=/dist/routes/_index-2JK54PLI.js.map

// LƯU Ý: Các hàm trong này chỉ dùng được trong extension context (các scripts có thuộc tính runInExtensionContext = true)
import { allScripts } from "../index.js";

// #region Tab Utils

// https://developer.chrome.com/docs/extensions/reference/windows/#method-getLastFocused
// Lấy window trình duyệt được sử dụng gần nhất
export const getLastFocusedWindow = () => {
  return !!CACHED.lastWindowId
    ? chrome.windows.get(CACHED.lastWindowId)
    : chrome.windows.getLastFocused({
        // populate: true,
        windowTypes: ["normal"],
      });
};

// Lấy ra tab hiện tại, trong window sử dung gần nhất
export const getCurrentTab = async () => {
  let win = await getLastFocusedWindow();
  let tabs = await chrome.tabs.query({
    // currentWindow: false,
    // lastFocusedWindow: false,
    windowId: win.id,
    active: true,
  });
  return tabs[0];
};

// https://stackoverflow.com/a/25226679/11898496
export function focusToTab(tab) {
  return chrome.tabs.update(tab.id, { active: true });
}

export function closeTab(tab) {
  return chrome.tabs.remove(tab.id);
}

export const runScript = async ({ func, tabId, args = [] }) => {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: func,
        args: args,
        world: chrome.scripting.ExecutionWorld.MAIN,
      },
      (injectionResults) => {
        // https://developer.chrome.com/docs/extensions/reference/scripting/#handling-results
        resolve(injectionResults.find((_) => _.result)?.result);
      }
    );
  });
};

export const runScriptFile = ({ scriptFile, tabId, args = [] }) => {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: [scriptFile],
        args: args,
        world: chrome.scripting.ExecutionWorld.MAIN,
      },
      (injectionResults) => {
        // https://developer.chrome.com/docs/extensions/reference/scripting/#handling-results
        resolve(injectionResults.find((_) => _.result)?.result);
      }
    );
  });
};

export const runScriptInCurrentTab = async (func, args) => {
  const tab = await getCurrentTab();
  focusToTab(tab);
  return await runScript({ func, args, tabId: tab.id });
};

export const runScriptFileInCurrentTab = async (scriptFile, args) => {
  const tab = await getCurrentTab();
  focusToTab();
  return await runScriptFile({ scriptFile, args, tabId: tab.id });
};

export async function getAvailableScripts() {
  let url = (await getCurrentTab()).url;
  let avai = [];
  for (let script of Object.values(allScripts)) {
    if (await checkBlackWhiteList(script, url)) {
      avai.push(script);
    }
  }
  return avai;
}

export const GlobalBlackList = ["edge://*", "chrome://*"];
export async function checkBlackWhiteList(script, url) {
  if (!url) return false;

  let w = script.whiteList,
    b = script.blackList,
    hasWhiteList = w?.length > 0,
    hasBlackList = b?.length > 0,
    inWhiteList = w?.findIndex((_) => isUrlMatchPattern(url, _)) >= 0,
    inBlackList = b?.findIndex((_) => isUrlMatchPattern(url, _)) >= 0,
    inGlobalBlackList =
      GlobalBlackList.findIndex((_) => isUrlMatchPattern(url, _)) >= 0;

  let willRun =
    !inGlobalBlackList &&
    ((!hasWhiteList && !hasBlackList) ||
      (hasWhiteList && inWhiteList) ||
      (hasBlackList && !inBlackList));

  return willRun;
}

export function isUrlMatchPattern(url, pattern) {
  let curIndex = 0,
    visiblePartsInPattern = pattern.split("*").filter((_) => _ !== "");
  for (let p of visiblePartsInPattern) {
    let index = url.indexOf(p, curIndex);
    if (index < 0) return false;
    curIndex = index + p.length;
  }
  return true;
}

// https://stackoverflow.com/a/68634884/11898496
export async function openWebAndRunScript({
  url,
  func,
  args,
  focusAfterRunScript = true,
  closeAfterRunScript = false,
}) {
  let tab = await chrome.tabs.create({ active: false, url: url });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: func,
    args: args,
  });
  focusAfterRunScript && focusToTab(tab);
  closeAfterRunScript && closeTab(tab);
}

export function attachDebugger(tab) {
  return chrome.debugger.attach({ tabId: tab.id }, "1.2");
}
export function detachDebugger(tab) {
  return chrome.debugger.detach({ tabId: tab.id });
}

// OMG: https://www.howtogeek.com/423558/how-to-take-full-page-screenshots-in-google-chrome-without-using-an-extension/
// https://developer.chrome.com/docs/extensions/reference/debugger/#method-attach
// https://chromedevtools.github.io/devtools-protocol/
// https://chromedevtools.github.io/devtools-protocol/tot/Page/#event-captureScreenshot
export async function sendDevtoolCommand(tab, commandName, commandParams = {}) {
  let res = await chrome.debugger.sendCommand(
    { tabId: tab.id },
    commandName,
    commandParams
  );
  return res;
}

// https://developer.chrome.com/docs/extensions/reference/tabs/#method-captureVisibleTab
// https://stackoverflow.com/q/14990822/11898496
// Merge image uri
// https://stackoverflow.com/a/50658710/11898496
// https://stackoverflow.com/a/50658710/11898496
export async function captureVisibleTab(options = {}, willDownload = true) {
  let imgData = await chrome.tabs.captureVisibleTab(null, {
    format: options.format || "png",
    quality: options.quality || 100,
  });
  willDownload && downloadURI(imgData, "img.png");
  return imgData;
}

// #endregion

// #region Download Utils

// https://stackoverflow.com/a/15832662/11898496
// TODO: chrome.downloads: https://developer.chrome.com/docs/extensions/reference/downloads/#method-download
export function downloadURI(uri, name) {
  var link = document.createElement("a");
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadData(data, filename, type) {
  var file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob)
    window.navigator.msSaveOrOpenBlob(file, filename);
  else {
    var a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}

// #endregion

// #region Security

export async function getCookie(domain, raw = false) {
  let cookies = await chrome.cookies.getAll({ domain });
  return raw
    ? cookies
    : cookies.map((_) => _.name + "=" + decodeURI(_.value)).join(";");
}

export const JSONUtils = {
  // https://stackoverflow.com/a/9804835/11898496
  isJson(item) {
    item = typeof item !== "string" ? JSON.stringify(item) : item;
    try {
      item = JSON.parse(item);
    } catch (e) {
      return false;
    }
    if (typeof item === "object" && item !== null) {
      return true;
    }
    return false;
  },

  // https://stackoverflow.com/a/52799327/11898496
  hasJsonStructure(str) {
    if (typeof str !== "string") return false;
    try {
      const result = JSON.parse(str);
      const type = Object.prototype.toString.call(result);
      return type === "[object Object]" || type === "[object Array]";
    } catch (err) {
      return false;
    }
  },

  // https://stackoverflow.com/a/52799327/11898496
  safeJsonParse(str) {
    try {
      return [null, JSON.parse(str)];
    } catch (err) {
      return [err];
    }
  },

  // https://stackoverflow.com/a/54174739/11898496
  strObjToObject(strObj) {
    try {
      let jsonStr = strObj.replace(/(\w+:)|(\w+ :)/g, function (s) {
        return '"' + s.substring(0, s.length - 1) + '":';
      });
      prompt("", jsonStr);
      return [null, JSON.parse(jsonStr)];
    } catch (e) {
      return [e];
    }
  },
};

// https://stackoverflow.com/a/38552302/11898496
export function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
  return JSON.parse(jsonPayload);
}

//#endregion

// #region Snap Utils (snaptik, snapinsta)

//prettier-ignore
export function doSomething(e,i,n){for(var r="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),t=r.slice(0,i),f=r.slice(0,n),o=e.split("").reverse().reduce(function(e,n,r){if(-1!==t.indexOf(n))return e+t.indexOf(n)*Math.pow(i,r)},0),c="";o>0;)c=f[o%n]+c,o=(o-o%n)/n;return c||"0"}
//prettier-ignore
export function doSomething2(r,o,e,n,a,f){f="";for(var t=0,g=r.length;t<g;t++){for(var h="";r[t]!==e[a];)h+=r[t],t++;for(var l=0;l<e.length;l++)h=h.replace(RegExp(e[l],"g"),l);f+=String.fromCharCode(doSomething(h,a,10)-n)}return decodeURIComponent(escape(f))}

// #endregion

// #region UI

const CACHED = {
  lastWindowId: 0,
};

// https://developer.chrome.com/docs/extensions/reference/windows/#event-onFocusChanged
chrome.windows.onFocusChanged.addListener(
  (windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE)
      CACHED.lastWindowId = windowId;
  },
  { windowTypes: ["normal"] }
);

const seperated_popup_search_param = "isSeparatedPopup";
// Kiểm tra xem extension đang chạy trong popup rời hay không
export const isExtensionInSeperatedPopup = () => {
  let url = new URL(location.href);
  return url.searchParams.has(seperated_popup_search_param);
};

// Mở extension trong popup rời
export const openExtensionInSeparatedPopup = () => {
  let url = new URL(location.href);
  url.searchParams.set(seperated_popup_search_param, 1);
  popupCenter({ url: url.href, title: "Useful scripts", w: 450, h: 700 });
};

// https://stackoverflow.com/a/4068385/11898496
export function popupCenter({ url, title, w, h }) {
  var left = screen.width / 2 - w / 2;
  var top = screen.height / 2 - h / 2;
  const newWindow = window.open(
    url,
    title,
    `
    scrollbars=yes,
    width=${w}, 
    height=${h}, 
    top=${top}, 
    left=${left}
    `
  );
  // newWindow.document.title = title;
  setTimeout(() => (newWindow.document.title = title), 0);
}

export function showLoading(text = "") {
  let html = `
    <div class="loading-container">
        <div>
            <div class="loader"></div><br/>
            <p class="text">${text}</p>
        </div>
    </div>
  `;
  let div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);

  let textP = document.querySelector(".loading-container .text");

  return {
    closeLoading: () => div?.remove?.(),
    setLoadingText: (textOrFunction) => {
      if (!textP) return;
      if (typeof textOrFunction === "function") {
        textP.innerHTML = textOrFunction(textP.innerHTML);
      } else {
        textP.innerHTML = textOrFunction;
      }
    },
  };
}

export function showPopup(title = "", innerHTML = "") {
  let html = `<div class="popup-container">
    <div class="popup-inner-container">
        <button class="close-btn">X</button>
        <h2 style="text-align: center; margin-bottom:10px">${title}</h2>
        ${innerHTML}
    </div>
  </div>`;
  let div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);

  document
    .querySelector(".popup-container .close-btn")
    ?.addEventListener?.("click", () => {
      div?.remove?.();
    });

  return {
    closePopup: () => div?.remove?.(),
  };
}

export function openPopupWithHtml(html, width = 300, height = 300) {
  let win = window.open(
    "",
    "",
    `scrollbars=yes,width=${width},height=${height}`
  );
  win.document.write(html);
}

// #endregion
import { UfsGlobal } from "./content-scripts/ufs_global.js";

export default {
  icon: "/assets/icon32.png",
  name: {
    en: "Useful-scripts statistic",
    vi: "Useful-scripts statistic",
  },
  description: {
    en: "Dev only",
    vi: "Dev only",
  },

  changeLogs: {
    "2024-04-23": "init",
    "2024-04-27": "scripts by uid + date picker",
    "2024-05-31": "trace uid",
  },

  whiteList: ["https://useful-script-statistic.glitch.me/log*"],

  pageScript: {
    onDocumentEnd,
  },
};

async function onDocumentEnd() {
  const logs = document.body.innerText
    .split("\n")
    .filter((_) => _)
    .map((_) => _.trim());

  if (!logs.length) return;

  let hasLog = logs[0] != "Log not found" && logs[0] != "Waking up";

  const allLogs = logs.map((log) => {
    return {
      log,
      uid: extractUid(log),
      time: new Date(extractTime(log)),
      timeString: extractTime(log),
      eventName: extractEventName(log),
      version: extractVersion(log),
      isScript: isScript(log),
    };
  });

  const container = document.createElement("div");

  if (hasLog) {
    UfsGlobal.Extension.getURL("/scripts/ufs_statistic.css").then(
      UfsGlobal.DOM.injectCssFile
    );

    // #region add search box
    document.body.innerText = "";

    const ol = document.createElement("ol");
    ol.setAttribute("reversed", true);
    document.body.appendChild(ol);
    const all_li = allLogs.map((data) => {
      let li = document.createElement("li");
      if (isFbUid(data?.uid)) {
        li.innerHTML =
          data.log +
          ` - <a href="https://fb.com/${data.uid}" target="_blank">
            <img src="${fbAvatarFromUid(data.uid)}" />
            fb
          </a>`;
      } else {
        li.textContent = data.log;
      }
      ol.appendChild(li);
      return { li, data };
    });
    console.log(all_li);

    const traceUidCheckmark = document.createElement("input");
    traceUidCheckmark.id = "trace-uid";
    traceUidCheckmark.type = "checkbox";
    traceUidCheckmark.checked = false;
    container.appendChild(traceUidCheckmark);
    traceUidCheckmark.addEventListener("change", (e) => {
      searchBox.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const label = document.createElement("label");
    label.textContent = "Trace by uid";
    label.setAttribute("for", traceUidCheckmark.id);
    container.appendChild(label);

    const searchBox = document.createElement("input");
    searchBox.placeholder = "Search logs...";
    container.prepend(searchBox);
    searchBox.addEventListener("input", (e) => {
      let searchText = e.target.value;

      if (!traceUidCheckmark.checked) {
        all_li.forEach(({ li, data }) => {
          if (
            !searchText ||
            data.log.toLowerCase().includes(searchText.toLowerCase())
          )
            li.classList.remove("hidden");
          else li.classList.add("hidden");
        });
      } else {
        let index = all_li.findIndex(({ li, data }) =>
          data.log?.includes?.(searchText)
        );
        if (!searchText || index == -1) {
          all_li.forEach(({ li }) => li.classList.remove("hidden"));
          return;
        }

        console.log(index);

        let indexes = [];

        // trace backward
        let uid = all_li[index].data.uid;
        for (let i = index; i >= 0; i--) {
          let cur = all_li[i];
          let pre = all_li[i - 1];

          if (cur.data.uid == uid) {
            indexes.unshift(i);
          }
          if (
            pre &&
            cur.data.uid == uid &&
            cur.data.version == pre.data.version &&
            cur.data.eventName.includes("ufs-RE-INSTALLED") &&
            pre?.data?.eventName?.includes?.("ufs-INSTALLED") &&
            Math.abs(pre.data.time.getTime() - cur.data.time.getTime()) < 2000 // 2s
          ) {
            indexes.unshift(i, i - 1);
            uid = pre.data.uid;
            console.log(uid);
          }
        }

        // forward
        uid = all_li[index].data.uid;
        for (let i = index; i < all_li.length - 1; i++) {
          let cur = all_li[i];
          let next = all_li[i + 1];
          if (cur.data.uid == uid) {
            indexes.push(i);
          }
          if (
            next &&
            next.data.uid == uid &&
            cur.data.version == next.data.version &&
            next.data.eventName.includes("ufs-INSTALLED") &&
            cur?.data?.eventName?.includes?.("ufs-RE-INSTALLED") &&
            Math.abs(next.data.time.getTime() - cur.data.time.getTime()) < 2000 // 2s
          ) {
            indexes.push(i, i + 1);
            uid = next.data.uid;
            console.log(uid);
          }
        }

        if (indexes.length) {
          all_li.forEach(({ li }) => li.classList.add("hidden"));
          indexes.forEach((i) => all_li[i].li.classList.remove("hidden"));
        } else {
          all_li.forEach(({ li }) => li.classList.remove("hidden"));
        }
      }
    });

    // #endregion

    // #region add graphs
    await UfsGlobal.DOM.injectScriptSrcAsync(
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"
    );

    // Count logs per hour
    const logsPerHour = Array(24).fill(0);
    allLogs.forEach((data) => {
      const hour = data.time.getHours();
      logsPerHour[hour]++;
    });

    // #region ======================== Per event name ========================
    const eventNameCount = new Map();
    allLogs.forEach((data) => {
      eventNameCount.set(
        data.eventName,
        (eventNameCount.get(data.eventName) || 0) + 1
      );
    });

    // sort by values
    const eventNameCountSorted = new Map(
      [...eventNameCount.entries()].sort((a, b) => b[1] - a[1])
    );

    const canvas_events = document.createElement("canvas");
    const ctx2 = canvas_events.getContext("2d");
    const eventNameChart = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: Array.from(eventNameCountSorted.keys()),
        datasets: [
          {
            data: Array.from(eventNameCountSorted.values()),
            backgroundColor: [
              "rgb(255, 99, 132)",
              "rgb(255, 159, 64)",
              "rgb(255, 205, 86)",
              "rgb(75, 192, 192)",
              "rgb(54, 162, 235)",
              "rgb(153, 102, 255)",
              "rgb(201, 203, 207)",
            ],
            hoverOffset: 4,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: `Number of logs per script name (${eventNameCount.size} scripts)`,
          },
        },
        responsive: true,
        onClick: (event, elements, chart) => {
          if (elements[0]) {
            const i = elements[0].index;
            let scriptId = chart.data.labels[i].split("(")[0];
            searchBox.value = scriptId;
            searchBox.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
      },
    });

    // #endregion

    // #region ======================== Event name Per hour ========================
    //   Stacked Bar Chart for each script
    const eventNamePerHour_dataset = Array.from(eventNameCount.keys()).map(
      (eventName) => {
        const data = Array(24).fill(0);
        allLogs.forEach((_) => {
          if (_.eventName === eventName) {
            let hour = _.time.getHours();
            data[hour]++;
          }
        });
        return {
          label: eventName + " (" + eventNameCount.get(eventName) + ")",
          data,
          backgroundColor: randColor(),
          stack: "combined",
          type: "bar",
        };
      }
    );

    const canvas_eventPerHour = document.createElement("canvas");
    const ctx3 = canvas_eventPerHour.getContext("2d");
    const eventNamePerHourChart = new Chart(ctx3, {
      type: "line",
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: eventNamePerHour_dataset.concat({
          label: "Total",
          data: logsPerHour,
          borderColor: "rgb(75, 192, 192)",
          type: "line",
          fill: false,
          tension: 0.5,
        }),
      },
      options: {
        datalabels: {
          display: true,
          formatter: (value) => value > 0,
        },
        responsive: true,
      },
    });

    const toggleShowHideAllBtn = document.createElement("button");
    toggleShowHideAllBtn.textContent = "Show/hide all";
    toggleShowHideAllBtn.onclick = function () {
      eventNamePerHourChart.data.datasets.forEach(function (ds) {
        ds.hidden = !ds.hidden;
      });
      eventNamePerHourChart.update();
    };
    // #endregion

    // #region ======================== Per uid ========================

    let logByUid = new Map();
    allLogs.forEach((data) => {
      logByUid.set(data.uid, (logByUid.get(data.uid) || 0) + 1);
    });

    // sort by values
    const logByUidSorted = new Map(
      [...logByUid.entries()].sort((a, b) => b[1] - a[1])
    );
    const fbUsers = [...logByUid.entries()].filter(([key, value]) => {
      return isFbUid(key);
    });

    const canvas_uid = document.createElement("canvas");
    const ctx4 = canvas_uid.getContext("2d");
    const uidChart = new Chart(ctx4, {
      type: "doughnut",
      data: {
        labels: Array.from(logByUidSorted.keys()),
        datasets: [
          {
            data: Array.from(logByUidSorted.values()),
            backgroundColor: [
              "rgb(255, 99, 132)",
              "rgb(255, 159, 64)",
              "rgb(255, 205, 86)",
              "rgb(75, 192, 192)",
              "rgb(54, 162, 235)",
              "rgb(153, 102, 255)",
              "rgb(201, 203, 207)",
            ],
            hoverOffset: 4,
          },
        ],
      },
      options: {
        onClick: (event, elements, chart) => {
          if (elements[0]) {
            const i = elements[0].index;
            let uid = chart.data.labels[i];
            let value = chart.data.datasets[0].data[i];
            searchBox.value = uid;
            searchBox.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: `Scripts used by uid (${logByUid.size} uids)`,
          },
        },
        responsive: true,
      },
    });

    // #endregion

    // ======================== show scripts only ========================

    let scriptOnlyState = false;
    const scriptOnlyToggle = document.createElement("button");
    scriptOnlyToggle.textContent = "Show scripts only (OFF)";
    scriptOnlyToggle.onclick = function () {
      scriptOnlyState = !scriptOnlyState;
      scriptOnlyToggle.textContent = scriptOnlyState
        ? "Show scripts only (ON)"
        : "Show scripts only (OFF)";
      scriptOnlyToggle.classList.toggle("btn-active", scriptOnlyState);
      all_li.forEach(({ li, data }) => {
        if (scriptOnlyState && !data.isScript) {
          li.classList.add("not-script");
        } else {
          li.classList.remove("not-script");
        }
      });
    };

    // ======================== Average section ========================
    const scriptsUsed = new Map();
    allLogs.forEach((data) => {
      if (data.isScript) {
        let scriptName = data.eventName;
        scriptsUsed.set(scriptName, (scriptsUsed.get(scriptName) || 0) + 1);
      }
    });

    let scriptUsedTotalCount = scriptsUsed.values().reduce((a, b) => a + b, 0);

    const h1 = document.createElement("h1");
    let hour = new Date().getHours() + 1;
    let _logsPerHour = ~~(allLogs.length / hour);
    let _eventsPerHour = ~~(eventNameCount.size / hour);
    let _scriptsPerHour = ~~(scriptUsedTotalCount / hour);
    h1.innerHTML = `${allLogs.length} logs (~${_logsPerHour} logs/hour)<br/>
      ${eventNameCount.size} unique events<br/><br/>
      ${scriptUsedTotalCount} scripts used (~${_scriptsPerHour} scripts/hour)<br/>
      ${scriptsUsed.size} unique scripts<br/><br/>
      ${logByUid.size} unique users<br/>
      ${fbUsers.length} facebook users`;

    // ======================== Append Charts ========================
    container.prepend(
      h1,
      toggleShowHideAllBtn,
      canvas_eventPerHour,
      canvas_events,
      canvas_uid,
      scriptOnlyToggle
    );
    // #endregion
  }

  // #region add date selector
  const prevDayBtn = document.createElement("button");
  prevDayBtn.textContent = "< Prev day";
  prevDayBtn.onclick = function () {
    let date = getCurrentLogDate();
    let newDate = addDate(date, -1);
    location.pathname = getPath(newDate);
  };

  const todayBtn = document.createElement("button");
  todayBtn.textContent = "Today";
  todayBtn.onclick = function () {
    location.pathname = "/log";
  };

  const nextDayBtn = document.createElement("button");
  nextDayBtn.textContent = "Next day >";
  nextDayBtn.onclick = function () {
    let date = getCurrentLogDate();
    let newDate = addDate(date, 1);
    location.pathname = getPath(newDate);
  };

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = getCurrentLogDate().toISOString().split("T")[0];
  dateInput.onchange = function () {
    location.pathname = getPath(new Date(dateInput.value));
  };

  container.prepend(prevDayBtn, todayBtn, nextDayBtn, dateInput);

  document.body.prepend(container);

  // #endregion
}

function getCurrentLogDate() {
  let splitted = location.pathname.split("/");
  let last = splitted[splitted.length - 1];
  if (last === "" || last === "log") return new Date();
  return new Date(last);
}

function addDate(date, amount) {
  let newDate = new Date(date);
  newDate.setDate(newDate.getDate() + amount);
  return newDate;
}

function dateToString(date) {
  let day = date.getDate().toString().padStart(2, "0");
  let month = (date.getMonth() + 1).toString().padStart(2, "0");
  let year = date.getFullYear();
  let dateString = `${year}-${month}-${day}`;
  return dateString;
}

function getPath(date) {
  return `/log/${dateToString(date)}`;
}

function randColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

function isFbUid(uid) {
  return (
    /\d+/.test(uid) &&
    (uid?.startsWith("100") || (uid?.length && uid?.length != 13))
  );
}
function fbAvatarFromUid(uid) {
  return `https://graph.facebook.com/${uid}/picture?height=50&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
}

// log example: 5/31/2024, 9:13:41 AM: OPEN-TAB-unlock (1.67-1717121281787) -> 43
function extractUid(log) {
  return /-(\d+)\)/.exec(log)?.[1];
}
function extractTime(log) {
  let lastColon = log.lastIndexOf(":");
  let time = log.substring(0, lastColon);
  return time;
}
function extractEventName(log) {
  let logWithoutUid = log.replace(/-\d+/, "");
  let lastColon = logWithoutUid.lastIndexOf(":");
  let lastArrow = logWithoutUid.lastIndexOf("->");
  let scriptName = logWithoutUid.substring(lastColon + 1, lastArrow - 1).trim();
  return scriptName;
}

function extractVersion(log) {
  let lastBracket = log.lastIndexOf("(");
  let nextDash = log.indexOf("-", lastBracket);
  return log.substring(lastBracket + 1, nextDash - 1).trim();
}

function isScript(log) {
  return !(
    log.includes("ufs-INSTALLED") ||
    log.includes("ufs-RE-INSTALLED") ||
    log.includes("OPEN-") ||
    log.includes("CLICK_") ||
    log.includes("-INFO") ||
    log.includes("-FAVORITE") ||
    log.includes("-VIEW-SOURCE")
  );
}

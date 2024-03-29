const inputSearch = document.querySelector("#search-inp");
const tableDiv = document.querySelector("table");
const searchCount = document.querySelector("#searchCount");

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function main() {
  try {
    let data = JSON.parse(localStorage.ufs_fb_msg_kount) || [];
    console.log(data);

    searchCount.innerHTML = data.length;

    tableDiv.innerHTML = `
        <tr>
          <th>Rank</th>
          <th>Group</th>
          <th>Name</th>
          <th>Count</th>
        </tr>
        ${data
          .map((c, i) => {
            let link = `https://www.facebook.com/messages/t/${c.id}`;
            let isGroup = c.type === "GROUP";
            let group = isGroup ? "✅" : "";
            let participants_name = c.participants
              .map(
                (_) =>
                  `<a target="_blank" href="https://fb.com/${_.id}">${_.name}</a>`
              )
              .filter((_) => _)
              .join(", ");
            let name = isGroup
              ? `${c.name}<br/>(${participants_name})`
              : c.name;
            let avatar = isGroup
              ? `<div class="avatar-list">
                ${c.participants
                  .map((p) => `<img class="avatar" src="${p?.avatar}" />`)
                  .join("")}
                </div>`
              : `<img class="avatar" src="${c.participants[0]?.avatar}" />`;

            return `<tr>
            <td>${i + 1}</td>
            <td>${group}</td>
            <td>
              ${avatar}
              <a href="${link}" target="_blank">${name}</a>
            </td>
            <td style="text-align: right">${numberWithCommas(c.count)}</td>
          </tr>`;
          })
          .join("")}
      `;

    inputSearch.oninput = (e) => {
      search(inputSearch.value);
    };
  } catch (e) {
    alert("ERROR: " + e);
  }
}

function search(text) {
  let count = 0;
  [...tableDiv.querySelectorAll("tr")].forEach((tr, index) => {
    if (index == 0) return; // ignore table header

    let html = tr.innerHTML;
    if (!html.toLowerCase().includes(text.toLowerCase())) {
      tr.classList.add("hidden");
    } else {
      tr.classList.remove("hidden");
      count++;
    }
  });
  searchCount.innerHTML = count;
}

main();

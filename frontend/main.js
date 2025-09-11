import { Window } from "@wailsio/runtime";
import { PostgresService } from "./bindings/github.com/uh-kay/sherlock/cmd/app";
import "@wailsio/runtime";

const sidebarElement = document.getElementById("sidebar");
const tableElement = document.getElementById("table");
const structureButton = document.getElementById("structure-btn");
const dataButton = document.getElementById("data-btn");
const toolbarElement = document.getElementById("toolbar");
const windowControlElement = document.getElementById("window-control");
const closeButton = document.getElementById("close-btn");
const hideButton = document.getElementById("hide-btn");
const maximizeButton = document.getElementById("maximize-btn");
const minimizeButton = document.getElementById("minimize-btn");
const dbInputElement = document.getElementById("db-input-div");
const pgConnectErrorElement = document.getElementById("pg-connect-error");
const pageControlElement = document.getElementById("page-control");
const logoutButton = document.getElementById("logout");

let currentTable = null;
let offset = 0;
let rowCount = 0;
let pageCount = 0;
let columnName = null;
let direction = null;

window.Connect = async () => {
  let host = document.getElementById("host").value;
  let port = document.getElementById("port").value;
  let user = document.getElementById("user").value;
  let password = document.getElementById("password").value;
  let database = document.getElementById("database").value;
  // let address = `postgres://${user}:${password}@${host}:${port}/${database}?sslmode=disable`;
  let address = `postgres://root:password@localhost:5433/social?sslmode=disable`;

  try {
    await PostgresService.Connect(address);
    const result = await PostgresService.ListTable();
    // TODO: store connection string instead of table list for performance?
    sessionStorage.setItem("tablesList", JSON.stringify(result));
    window.location.href = "/postgres";
  } catch {
    dbInputElement.classList.replace("mb-4", "mb-2");
    pgConnectErrorElement.classList.toggle("hidden");
  }
};

sidebarElement?.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    const tablename = e.target.dataset.table;
    currentTable = tablename;

    sidebarElement
      .querySelectorAll("button")
      .forEach((btn) => btn.classList.remove("text-blue-500"));
    e.target.classList.add("text-blue-500");

    onTableSwitch(tablename);
  }
});

tableElement?.addEventListener("click", (e) => {
  const th = e.target.closest("th[data-column-name]");
  if (th && th.dataset.columnName) {
    const clickedColumn = th.dataset.columnName;

    tableElement.querySelectorAll("th").forEach((th) => {
      if (th.dataset.columnName) {
        const flexDiv = th.querySelector("div.flex");
        if (flexDiv) {
          flexDiv.innerHTML = th.dataset.columnName;
        }
      }
    });

    if (columnName === clickedColumn) {
      direction = direction === "ASC" ? "DESC" : "ASC";
    } else {
      columnName = clickedColumn;
      direction = "ASC";
    }

    offset = 0;
    pageCount = 1;

    showTableData(currentTable, columnName, direction, offset);
  }
});

structureButton?.addEventListener("click", () => {
  setActiveButton(structureButton);
  showTableStructure(currentTable);
});

dataButton?.addEventListener("click", () => {
  setActiveButton(dataButton);
  showTableData(currentTable);
});

function setActiveButton(activeBtn) {
  [structureButton, dataButton].forEach((btn) => {
    btn?.classList.remove("bg-gray-100/25");
  });
  activeBtn?.classList.add("bg-gray-100/25");
}

function onTableSwitch(newTable) {
  currentTable = newTable;
  columnName = null;
  direction = null;
  offset = 0;
  pageCount = 1;
  setActiveButton(dataButton);
  showTableData(newTable, columnName, direction, offset);
  showRowCount(newTable);
}

function showTableData(
  tablename,
  sortColumn = null,
  direction = null,
  offset = 0,
) {
  PostgresService.ListData(tablename, sortColumn, direction, offset)
    .then((data) => {
      tableElement.innerHTML = createTableHTML(data);
      pageControlElement.classList.remove("hidden");
      updatePaginationElements(data);
      if (sortColumn) {
        const activeHeader = document.querySelector(
          `th[data-column-name="${sortColumn}"]`,
        );
        if (activeHeader) {
          const chevronDown = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2"><path d="m6 9 6 6 6-6"/></svg>`;
          const chevronUp = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2"><path d="m18 15-6-6-6 6"/></svg>`;
          const arrow = direction === "ASC" ? chevronUp : chevronDown;
          const flexDiv = activeHeader.querySelector("div.flex");
          if (flexDiv) {
            flexDiv.innerHTML = `${sortColumn} ${arrow}`;
          }
        }
      }
    })
    .catch((error) => {
      tableElement.innerHTML = `<p class="text-red-600">Error loading data: ${error.message}</p>`;
    });
}

// TODO: Should page control persist sort between pages?
window.showNextPage = () => {
  offset += 50;
  pageCount += 1;
  showTableData(currentTable, null, null, offset);
};

window.showPreviousPage = () => {
  offset = Math.max(0, offset - 50);
  pageCount = Math.max(1, pageCount - 1);
  showTableData(currentTable, null, null, offset);
};

function updatePaginationElements(data = null) {
  const previousButton = document.getElementById("previous-button");
  const nextButton = document.getElementById("next-button");
  const pageCountElement = document.getElementById("page-count");
  const rowCountElement = document.getElementById("row-count");

  previousButton.disabled = offset === 0;
  nextButton.disabled = offset + 50 >= rowCount;
  if (data.length) {
    pageCountElement.innerHTML = `Page ${pageCount} of ${Math.ceil(rowCount / 50)}`;
    rowCountElement.innerHTML = `(${offset + 1} - ${data.length + offset} of ${rowCount} rows)`;
  } else {
    pageCountElement.innerHTML = "";
    rowCountElement.innerHTML = `0 row`;
  }
}

function showRowCount(tablename) {
  PostgresService.ListCount(tablename).then((data) => {
    rowCount = data;
    updatePaginationElements();
  });
}

function showTableStructure(tablename) {
  Promise.all([
    PostgresService.ListStructure(tablename),
    PostgresService.ListIndex(tablename),
  ]).then(([structure, index]) => {
    const structureHTML = createStructureHTML(structure);
    const indexHTML = createIndexHTML(index);

    pageControlElement.classList.toggle("hidden");

    tableElement.innerHTML = `
      <div>
        ${structureHTML}
        <div class="mt-4 dark:text-white text-md font-semibold">Indexes:</div>
        ${indexHTML}
      </div>
      `;
  });
}

function createIndexHTML(index) {
  if (!index || index.length === 0) {
    return '<p class="text-gray-600 dark:text-gray-300">No index information available</p>';
  }

  let html = `<table class="w-full border-collapse border border-gray-300">
    <thead><tr>
    <th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">index_name</th>
    <th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">index_definition</th>
    </tr></thead>
    <tbody>`;

  index.forEach((column) => {
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-50/25">
      <td class="p-2 border border-gray-200 dark:text-gray-200">${column.index_name || ""}</td>
      <td class="p-2 border border-gray-200 dark:text-gray-200">${column.index_definition || ""}</td>
      </tr>`;
  });

  html += "</tbody></table>";
  return html;
}

function createTableHTML(data) {
  if (!data || data.length === 0) {
    return '<p class="text-gray-600 dark:text-gray-300">No data available</p>';
  }
  const headers = Object.keys(data[0]);
  let html = '<table class="w-full border-collapse border border-gray-300">';
  html += "<thead><tr>";
  headers.forEach((header) => {
    html += `<th data-column-name="${header}" class="p-3 text-left border border-gray-300 font-medium dark:text-gray-200"><div class="flex items-center">${header}</div></th>`;
  });
  html += "</tr></thead>";
  html += "<tbody>";
  data.forEach((row) => {
    html += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-50/25">';
    headers.forEach((header) => {
      html += `<td class="p-2 border border-gray-300 dark:text-gray-200">${row[header] || ""}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

function createStructureHTML(structure) {
  if (!structure || structure.length === 0) {
    return '<p class="text-gray-600">No structure information available</p>';
  }

  let html = `<table class="w-full border-collapse border border-gray-300">
    <thead><tr>
    <th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">column_name</th>
    <th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">data_type</th>
    <th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">nullable</th>
    <th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">default</th>
    </tr></thead>
    <tbody>`;

  structure.forEach((column) => {
    html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-50/25">
      <td class="p-2 border border-gray-200 dark:text-gray-200">${column.column_name || ""}</td>
      <td class="p-2 border border-gray-200 dark:text-gray-200">${column.data_type || ""}</td>
      <td class="p-2 border border-gray-200 dark:text-gray-200">${column.nullable || ""}</td>
      <td class="p-2 border border-gray-200 dark:text-gray-200">${column.column_default || "NULL"}</td>
      </tr>`;
  });

  html += "</tbody></table>";
  return html;
}

function setTableDimensions() {
  const calculate = () => {
    const sidebarWidth =
      Math.max(sidebarElement.offsetWidth, sidebarElement.scrollWidth) + 1;
    const toolbarHeight = toolbarElement.offsetHeight;
    const pageControlHeight = pageControlElement.offsetHeight;

    tableElement.style.maxWidth = `calc(100vw - ${sidebarWidth}px - 32px)`;
    tableElement.style.maxHeight = `calc(100vh - ${toolbarHeight + pageControlHeight}px)`;
  };

  calculate();
  const resizeObserver = new ResizeObserver(() => {
    calculate();
  });

  resizeObserver.observe(pageControlElement);
  resizeObserver.observe(sidebarElement);
  resizeObserver.observe(toolbarElement);
}

function updateToolbarOffset() {
  if (!sidebarElement || !toolbarElement) return;
  const sidebarWidth = sidebarElement.offsetWidth || 0;
  const windowControlWidth = windowControlElement.offsetWidth;
  if (getComputedStyle(toolbarElement).position === "absolute") {
    toolbarElement.style.width = `calc(100vw - ${sidebarWidth + windowControlWidth}px)`;
  }
  toolbarElement.classList.remove("absolute");
}

window.addEventListener("load", () =>
  requestAnimationFrame(updateToolbarOffset),
);
window.addEventListener("resize", updateToolbarOffset);

document.addEventListener("DOMContentLoaded", setTableDimensions);
window.addEventListener("load", () =>
  requestAnimationFrame(setTableDimensions),
);
window.addEventListener("resize", setTableDimensions);

closeButton.addEventListener("click", () => {
  PostgresService.Close();
  Window.Close();
});

hideButton.addEventListener("click", () => {
  Window.Minimise();
});

maximizeButton.addEventListener("click", () => {
  Window.ToggleMaximise();
  maximizeButton.classList.toggle("hidden");
  minimizeButton.classList.toggle("hidden");
});

minimizeButton.addEventListener("click", () => {
  Window.ToggleMaximise();
  maximizeButton.classList.toggle("hidden");
  minimizeButton.classList.toggle("hidden");
});

logoutButton.addEventListener("click", () => {
  PostgresService.Close();
  window.location.href = "/index";
});

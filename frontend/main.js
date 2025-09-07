import { Window } from "@wailsio/runtime";
import { PostgresService } from "./bindings/sqlexplorer/cmd/app";
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

let currentTable = null;

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

structureButton?.addEventListener("click", () => {
  if (currentTable) {
    setActiveButton(structureButton);
    showTableStructure(currentTable);
  } else {
    tableElement.innerHTML =
      '<p class="text-gray-600">Please select a table first</p>';
  }
});

dataButton?.addEventListener("click", () => {
  if (currentTable) {
    setActiveButton(dataButton);
    showTableData(currentTable);
  } else {
    tableElement.innerHTML =
      '<p class="text-gray-600">Please select a table first</p>';
  }
});

function setActiveButton(activeBtn) {
  [structureButton, dataButton].forEach((btn) => {
    btn?.classList.remove("bg-gray-100/25");
  });
  activeBtn?.classList.add("bg-gray-100/25");
}

function onTableSwitch(newTable) {
  currentTable = newTable;
  setActiveButton(dataButton);
  showTableData(newTable);
}

let offset = 0;

function showTableData(tablename) {
  PostgresService.ListData(tablename, offset)
    .then((data) => {
      tableElement.innerHTML = createTableHTML(data);
    })
    .catch((error) => {
      tableElement.innerHTML = `<p class="text-red-600">Error loading data: ${error.message}</p>`;
    });
}

window.showNextPage = () => {
  offset += 50;
  PostgresService.ListData(currentTable, offset)
    .then((data) => {
      tableElement.innerHTML = createTableHTML(data);
    })
    .catch((error) => {
      tableElement.innerHTML = `<p class="text-red-600">Error loading data: ${error.message}</p>`;
    });
};

window.showPreviousPage = () => {
  offset -= 50;
  PostgresService.ListData(currentTable, offset)
    .then((data) => {
      tableElement.innerHTML = createTableHTML(data);
    })
    .catch((error) => {
      tableElement.innerHTML = `<p class="text-red-600">Error loading data: ${error.message}</p>`;
    });
};

function showTableStructure(tablename) {
  PostgresService.ListStructure(tablename)
    .then((structure) => {
      tableElement.innerHTML = createStructureHTML(structure);
    })
    .catch((error) => {
      tableElement.innerHTML = `<p class="text-red-600">Error loading structure: ${error.message}</p>`;
    });
}

function createTableHTML(data) {
  if (!data || data.length === 0) {
    return '<p class="text-gray-600">No data available</p>';
  }
  const headers = Object.keys(data[0]);
  let html = '<table class="w-full border-collapse border border-gray-300">';
  html += "<thead><tr>";
  headers.forEach((header) => {
    html += `<th class="p-3 text-left border border-gray-300 font-medium dark:text-gray-200">${header}</th>`;
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

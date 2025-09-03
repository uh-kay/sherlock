import { DatabaseService } from "./bindings/sqlexplorer/cmd/app";

const sidebarElement = document.getElementById("sidebar");
const tableElement = document.getElementById("table");
const structureButton = document.getElementById("structure-btn");
const dataButton = document.getElementById("data-btn");
const toolbar = structureButton ? structureButton.parentElement : null;

function updateToolbarOffset() {
  if (!sidebarElement || !toolbar) return;
  const w = sidebarElement.offsetWidth || 0;
  if (getComputedStyle(toolbar).position === "absolute") {
    toolbar.style.left = w + "px";
    toolbar.style.width = `calc(100vw - ${w}px)`;
    toolbar.style.marginLeft = ""; 
  }
}

window.addEventListener("load", () => requestAnimationFrame(updateToolbarOffset));
window.addEventListener("resize", updateToolbarOffset);

if (window.ResizeObserver && sidebarElement) {
  const ro = new ResizeObserver(() => updateToolbarOffset());
  ro.observe(sidebarElement);
}
let currentTable = null; // Track the currently selected table

// Load table list
DatabaseService.ListTable().then((result) => {
  sidebarElement.innerHTML = result
    .map(
      (item) =>
        `<button data-table="${item}" class="hover:text-blue-500">${item}</button>`,
    )
    .join("");
});

// Handle sidebar table selection
sidebarElement.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    const tablename = e.target.dataset.table;
    currentTable = tablename;

    // Highlight selected table
    sidebarElement
      .querySelectorAll("button")
      .forEach((btn) => btn.classList.remove("text-blue-500"));
    e.target.classList.add("text-blue-500");

    // Default to showing data when a table is selected
    showTableData(tablename);
  }
});

// Handle Structure button click
structureButton?.addEventListener("click", () => {
  if (currentTable) {
    dataButton.classList.remove("bg-gray-100/25");
    structureButton.classList.add("bg-gray-100/25");
    showTableStructure(currentTable);
  } else {
    tableElement.innerHTML =
      '<p class="text-gray-600">Please select a table first</p>';
  }
});

// Handle Data button click
dataButton?.addEventListener("click", () => {
  if (currentTable) {
    dataButton.classList.add("bg-gray-100/25");
    structureButton.classList.remove("bg-gray-100/25");
    showTableData(currentTable);
  } else {
    tableElement.innerHTML =
      '<p class="text-gray-600">Please select a table first</p>';
  }
});

function showTableData(tablename) {
  DatabaseService.ListData(tablename)
    .then((data) => {
      tableElement.innerHTML = createTableHTML(data);
    })
    .catch((error) => {
      tableElement.innerHTML = `<p class="text-red-600">Error loading data: ${error.message}</p>`;
    });
}

function showTableStructure(tablename) {
  DatabaseService.ListStructure(tablename)
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

  let html = '<table class="w-full border-collapse border border-gray-300">';
  html += "<thead><tr>";
  html +=
    '<th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">column_name</th>';
  html +=
    '<th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">data_type</th>';
  html +=
    '<th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">nullable</th>';
  html +=
    '<th class="p-3 text-left border border-gray-200 font-medium dark:text-gray-200">default</th>';
  html += "</tr></thead>";
  html += "<tbody>";

  structure.forEach((column) => {
    html += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-50/25">';
    html += `<td class="p-2 border border-gray-200 dark:text-gray-200">${column.column_name || ""}</td>`;
    html += `<td class="p-2 border border-gray-200 dark:text-gray-200">${column.data_type || ""}</td>`;
    html += `<td class="p-2 border border-gray-200 dark:text-gray-200">${column.nullable || ""}</td>`;
    html += `<td class="p-2 border border-gray-200 dark:text-gray-200">${column.column_default || "NULL"}</td>`;
    html += "</tr>";
  });

  html += "</tbody></table>";
  return html;
}

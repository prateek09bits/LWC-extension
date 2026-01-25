console.log("📦 App UI Loaded");

const tableBody = document.getElementById("dependencyTable");

// 🔥 Receive data from background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "LWC_DEPENDENCY_DATA") {
    console.log("✅ Data received in app.js:", message.payload);
    renderTable(message.payload);
  }
});

function renderTable(records) {
  tableBody.innerHTML = "";

  if (!records || records.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="2">No dependencies found</td></tr>`;
    return;
  }

  records.forEach((rec) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${rec.MetadataComponentName}</td>
      <td>${rec.RefMetadataComponentName}</td>
    `;

    tableBody.appendChild(row);
  });
}
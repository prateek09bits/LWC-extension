console.log("Salesforce Schema Extension Loaded");

// Detect if user is on Salesforce
if (window.location.hostname.includes("salesforce.com") ||
    window.location.hostname.includes("lightning.force.com")) {

    console.log("Salesforce org detected!");

    // Inject UI panel (your schema builder)
    const panel = document.createElement("div");
    panel.id = "schema-builder-panel";
    panel.innerHTML = `
        <h3>Schema Builder</h3>
        <button id="connectBtn">Connect to Org</button>
        <div id="status"></div>
    `;

    document.body.appendChild(panel);

    document.getElementById("connectBtn").addEventListener("click", () => {
        getSalesforceSession();
    });
}

function getSalesforceSession() {
    // Try to read Salesforce session cookie
    const cookies = document.cookie;
    console.log("Cookies:", cookies);

    document.getElementById("status").innerText = "Connected to Salesforce!";
}

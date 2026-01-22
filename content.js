console.log("Salesforce Schema Extension Loaded: ", window.location.hostname);

// Detect if user is on Salesforce
if (window.location.hostname.includes("salesforce.com") ||
    window.location.hostname.includes("lightning.force.com") ||
    window.location.hostname.includes("salesforce-setup.com")) {

    const cookies = document.cookie;
    console.log("Cookies:", JSON.stringify(cookies));

    chrome.runtime.sendMessage({ type: "salesforce_cookies", cookies });
} else {
    alert('Please launch the extension on a Salesforce org page.');
}

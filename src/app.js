// let cookies;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in background script:", message);
    if (message && message.type === "salesforce_cookies") {
        console.log("Received cookies from content script:", message.cookies);
        // cookies = message.cookies;
        sendResponse({ status: "ok" });
    }
});
// console.log(cookies);
// console.log(typeof cookies);
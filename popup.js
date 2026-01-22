document.getElementById("launchBtn").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["content.js"]
    });
  });

  chrome.tabs.create({
    url: chrome.runtime.getURL("src/app.html")
  });
});

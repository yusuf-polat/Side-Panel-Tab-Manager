// Log when the background script loads
console.log("Background script loaded")

// Mesaj iletişimi için global değişkenler
const pendingMessages = []
let sidePanelReady = false

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: "open-in-side-panel",
      title: chrome.i18n.getMessage("openCurrentTab") || "Open in Side Panel",
      contexts: ["page", "link"],
    })
    console.log("Context menu created successfully")
  } catch (error) {
    console.error("Error creating context menu:", error)
  }
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-in-side-panel") {
    try {
      // Open the side panel - windowId kontrolü ekle
      try {
        if (tab && tab.windowId && tab.windowId !== -1) {
          chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
            console.error("Error opening side panel with window ID:", error)
            // Hata durumunda parametresiz dene
            chrome.sidePanel.open().catch((fallbackError) => {
              console.error("Fallback side panel open also failed:", fallbackError)
            })
          })
        } else {
          // Pencere ID'si geçersizse, parametresiz aç
          chrome.sidePanel.open().catch((error) => {
            console.error("Error opening side panel without window ID:", error)
          })
        }
      } catch (sidePanelError) {
        console.error("Error in side panel open:", sidePanelError)
      }

      // URL'yi sakla, side panel hazır olduğunda gönderilecek
      const url = info.linkUrl || info.pageUrl
      storeMessageForSidePanel({
        action: "openInSidePanel",
        url: url,
        title: tab.title || chrome.i18n.getMessage("newTab") || "New Tab",
      })
    } catch (error) {
      console.error("Error in context menu click handler:", error)
    }
  }
})

// Listen for extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log("Extension icon clicked for tab:", tab.id)

  try {
    // Check if the current tab is a restricted page
    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.includes("chrome.google.com/webstore")
    ) {
      // Show an alert or notification that this page cannot be modified
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: chrome.i18n.getMessage("restrictedNotificationTitle") || "Side Panel Tab Manager",
        message:
          chrome.i18n.getMessage("restrictedNotificationMessage") || "This page cannot be opened in the side panel.",
        priority: 2,
      })
      console.log("Cannot run on restricted page:", tab.url)
      return
    }

    // Open the side panel - windowId kontrolü ekle
    try {
      if (tab.windowId && tab.windowId !== -1) {
        await chrome.sidePanel.open({ windowId: tab.windowId })
      } else {
        // Pencere ID'si geçersizse, geçerli pencereyi bul
        const windows = await chrome.windows.getCurrent()
        if (windows && windows.id) {
          await chrome.sidePanel.open({ windowId: windows.id })
        } else {
          // Hiçbir pencere bulunamazsa, parametresiz aç
          await chrome.sidePanel.open()
        }
      }
    } catch (sidePanelError) {
      console.error("Error opening side panel:", sidePanelError)
      // Hata durumunda parametresiz dene
      try {
        await chrome.sidePanel.open()
      } catch (fallbackError) {
        console.error("Fallback side panel open also failed:", fallbackError)
      }
    }

    // URL'yi sakla, side panel hazır olduğunda gönderilecek
    storeMessageForSidePanel({
      action: "openInSidePanel",
      url: tab.url,
      title: tab.title || chrome.i18n.getMessage("newTab") || "New Tab",
    })
  } catch (error) {
    console.error("Error in action click handler:", error)
  }
})

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-side-panel") {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0]
          // windowId kontrolü ekle
          if (tab.windowId && tab.windowId !== -1) {
            chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
              console.error("Error opening side panel with window ID:", error)
              // Hata durumunda parametresiz dene
              chrome.sidePanel.open().catch((fallbackError) => {
                console.error("Fallback side panel open also failed:", fallbackError)
              })
            })
          } else {
            // Pencere ID'si geçersizse, parametresiz aç
            chrome.sidePanel.open().catch((error) => {
              console.error("Error opening side panel without window ID:", error)
            })
          }
        } else {
          // Aktif sekme bulunamazsa, parametresiz aç
          chrome.sidePanel.open().catch((error) => {
            console.error("Error opening side panel without active tab:", error)
          })
        }
      })
    } catch (error) {
      console.error("Error in keyboard shortcut handler:", error)
    }
  }
})

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message)

  // Side panel hazır olduğunda bekleyen mesajları gönder
  if (message.action === "sidePanelReady") {
    sidePanelReady = true
    console.log("Side panel is ready, sending pending messages:", pendingMessages.length)

    // Bekleyen tüm mesajları gönder
    while (pendingMessages.length > 0) {
      const pendingMessage = pendingMessages.shift()
      try {
        chrome.runtime.sendMessage(pendingMessage).catch((error) => {
          console.error("Error sending pending message to side panel:", error)
        })
      } catch (error) {
        console.error("Error sending pending message:", error)
      }
    }

    sendResponse({ success: true })
    return true
  }

  if (message.action === "openInSidePanel") {
    // This message is handled by the side panel directly
    sendResponse({ success: true })
    return true
  }

  return true // Keep the message channel open for async responses
})

// Mesajları sakla ve side panel hazır olduğunda gönder
function storeMessageForSidePanel(message) {
  if (sidePanelReady) {
    // Side panel hazırsa hemen gönder
    try {
      chrome.runtime.sendMessage(message).catch((error) => {
        console.error("Error sending message to side panel:", error)
      })
    } catch (error) {
      console.error("Error sending message:", error)
      // Hata durumunda mesajı sakla
      pendingMessages.push(message)
    }
  } else {
    // Side panel hazır değilse mesajı sakla
    console.log("Side panel not ready, storing message for later:", message)
    pendingMessages.push(message)
  }
}

// Side panel kapatıldığında hazır durumunu sıfırla
setInterval(() => {
  // Side panel'in açık olup olmadığını kontrol etmek için bir yöntem olmadığından,
  // burada sadece mesaj gönderme denemesi yapabiliriz
  if (sidePanelReady) {
    chrome.runtime.sendMessage({ action: "ping" }).catch(() => {
      // Mesaj gönderilemezse, side panel muhtemelen kapalıdır
      console.log("Side panel appears to be closed, resetting ready state")
      sidePanelReady = false
    })
  }
}, 10000) // Her 10 saniyede bir kontrol et

// Listen for installation events
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed or updated:", details.reason)
  if (details.reason === "install") {
    try {
      // Show welcome notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: chrome.i18n.getMessage("welcomeNotificationTitle") || "Side Panel Tab Manager",
        message:
          chrome.i18n.getMessage("welcomeNotificationMessage") ||
          "Extension successfully installed. Click the extension icon to open tabs in the side panel.",
        priority: 2,
      })
    } catch (error) {
      console.error("Error showing welcome notification:", error)
    }
  }
})

console.log("Background script initialization complete")

// background.js dosyasına dil değişikliğini dinleyen bir kod ekleyin
// Mevcut kodun sonuna ekleyin

// Dil değişikliğini dinle
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.sidePanelSettings) {
    const newSettings = changes.sidePanelSettings.newValue
    const oldSettings = changes.sidePanelSettings.oldValue

    // Dil değişikliği varsa
    if (newSettings && oldSettings && newSettings.language !== oldSettings.language) {
      console.log(`Language changed from ${oldSettings.language} to ${newSettings.language}`)

      // Tüm açık pencerelere dil değişikliğini bildir
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          try {
            chrome.tabs
              .sendMessage(tab.id, { action: "languageChanged", language: newSettings.language })
              .catch((err) => console.log("Could not send message to tab:", tab.id, err))
          } catch (e) {
            console.error("Error sending language change message:", e)
          }
        })
      })
    }
  }
})


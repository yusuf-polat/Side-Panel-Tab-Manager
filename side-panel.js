// Chrome eklentilerinde chrome objesi zaten global olarak tanımlanmıştır
// Bu yüzden tekrar tanımlamaya gerek yok

// Declare chrome object for environments where it might not be defined (e.g., testing)
if (typeof chrome === "undefined") {
  var chrome = {}
}

// State management
let tabs = []
let activeTabId = null
// State management - proxy özelliğini kaldır
// Update the settings object to include more language options
let settings = {
  searchEngine: "google", // Default search engine
  theme: "light", // Tema seçeneği ekle
  language: "en", // Default language
}

// DOM elements
let container, tabBar, newTabButton, content

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log("Side panel DOM loaded")

    // Replace placeholder i18n messages in HTML
    replaceI18nMessages()

    container = document.getElementById("container")
    tabBar = document.getElementById("tab-bar")
    newTabButton = document.getElementById("new-tab-button")
    content = document.getElementById("content")

    if (!container || !tabBar || !newTabButton || !content) {
      console.error("Required DOM elements not found")
      return
    }

    console.log("DOM elements found, initializing side panel")

    // Load settings first
    loadSettings(() => {
      // Then load tabs
      loadTabs(() => {
        // Side panel hazır olduğunu background script'e bildir
        notifySidePanelReady()
      })
    })

    // Event listeners
    console.log("Adding event listeners")

    newTabButton.addEventListener("click", () => {
      console.log("New tab button clicked")
      createNewTab()
    })

    const openCurrentTabButton = document.getElementById("open-current-tab")
    if (openCurrentTabButton) {
      console.log("Open current tab button found")
      openCurrentTabButton.addEventListener("click", () => {
        console.log("Open current tab button clicked")
        openCurrentTab()
      })
    } else {
      console.error("Open current tab button not found")
    }

    // Listen for messages from background script
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Side panel received message:", message)

        if (message && message.action === "openInSidePanel") {
          try {
            addTab(message.url, message.title)
            sendResponse({ success: true })
          } catch (error) {
            console.error("Error handling openInSidePanel message:", error)
            sendResponse({ success: false, error: error.message })
          }
        }

        // Ping mesajlarına yanıt ver
        if (message && message.action === "ping") {
          sendResponse({ success: true, status: "alive" })
        }

        return true // Keep the message channel open for async responses
      })
    }

    // Dil değişikliği mesajını dinle
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.action === "languageChanged") {
        console.log("Language change message received:", message.language)
        // Dil değişikliğini uygula
        settings.language = message.language
        // Metinleri güncelle
        replaceI18nMessages()
        sendResponse({ success: true })
      }
      return true
    })
  } catch (error) {
    console.error("Error initializing side panel:", error)
  }
})

// Initialize fonksiyonunu güncelleyin - replaceI18nMessages fonksiyonunu daha kapsamlı hale getirin
// replaceI18nMessages fonksiyonunu tamamen değiştirin

function replaceI18nMessages() {
  try {
    console.log("Replacing i18n messages with current language:", settings.language)

    // Tüm HTML içeriğini tarayarak __MSG_ ile başlayan metinleri değiştir
    const processNode = (node) => {
      // Metin düğümlerini işle
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.nodeValue
        if (content && content.includes("__MSG_")) {
          // Tüm mesaj kalıplarını bul
          const regex = /__MSG_(\w+)__/g
          let match
          let newContent = content
          let changed = false

          while ((match = regex.exec(content))) {
            const key = match[1]
            const translated = chrome.i18n.getMessage(key)
            if (translated) {
              newContent = newContent.replace(match[0], translated)
              changed = true
            }
          }

          if (changed) {
            node.nodeValue = newContent
          }
        }
      }
      // Öznitelik düğümlerini işle
      else if (node.nodeType === Node.ELEMENT_NODE) {
        // title, placeholder, alt gibi öznitelikleri kontrol et
        const attributesToCheck = ["title", "placeholder", "alt", "value", "aria-label"]

        attributesToCheck.forEach((attr) => {
          if (node.hasAttribute(attr)) {
            const attrValue = node.getAttribute(attr)
            if (attrValue && attrValue.includes("__MSG_")) {
              const regex = /__MSG_(\w+)__/g
              let match
              let newValue = attrValue
              let changed = false

              while ((match = regex.exec(attrValue))) {
                const key = match[1]
                const translated = chrome.i18n.getMessage(key)
                if (translated) {
                  newValue = newValue.replace(match[0], translated)
                  changed = true
                }
              }

              if (changed) {
                node.setAttribute(attr, newValue)
              }
            }
          }
        })

        // Özel durum: innerHTML içinde __MSG_ kalıpları
        if (node.innerHTML && node.innerHTML.includes("__MSG_")) {
          const regex = /__MSG_(\w+)__/g
          let match
          let newHTML = node.innerHTML
          let changed = false

          while ((match = regex.exec(node.innerHTML))) {
            const key = match[1]
            const translated = chrome.i18n.getMessage(key)
            if (translated) {
              newHTML = newHTML.replace(match[0], translated)
              changed = true
            }
          }

          if (changed) {
            node.innerHTML = newHTML
          }
        }

        // Alt düğümleri işle
        Array.from(node.childNodes).forEach(processNode)
      }
    }

    // Tüm belgeyi işle
    processNode(document.body)

    // Özel durumlar için ek işlemler
    // Örneğin, dinamik olarak oluşturulan içerikler için
    updateDynamicContent()
  } catch (error) {
    console.error("Error replacing i18n messages:", error)
  }
}

// Dinamik içerikleri güncellemek için yeni bir fonksiyon ekleyin
function updateDynamicContent() {
  try {
    // Özel durumlar için burada ek işlemler yapabilirsiniz
    // Örneğin, JavaScript ile oluşturulan düğmeler, başlıklar vb.

    // Yeni sekme butonu
    if (newTabButton) {
      newTabButton.title = chrome.i18n.getMessage("newTab") || "New Tab"
    }

    // Ayarlar butonu
    const settingsButton = document.getElementById("settings-button")
    if (settingsButton) {
      settingsButton.title = chrome.i18n.getMessage("settings") || "Settings"
    }

    // Diğer dinamik içerikler...
  } catch (error) {
    console.error("Error updating dynamic content:", error)
  }
}

// Side panel'in hazır olduğunu background script'e bildir
function notifySidePanelReady() {
  try {
    console.log("Notifying background script that side panel is ready")
    chrome.runtime
      .sendMessage({ action: "sidePanelReady" })
      .then((response) => {
        console.log("Background script acknowledged side panel ready:", response)
      })
      .catch((error) => {
        console.error("Error notifying background script:", error)
      })
  } catch (error) {
    console.error("Error sending ready notification:", error)
  }
}

// Load settings from storage - proxy özelliğini kaldır
function loadSettings(callback) {
  try {
    chrome.storage.local.get(["sidePanelSettings"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError)
        if (callback) callback()
        return
      }

      if (result.sidePanelSettings) {
        // Ayarları yüklerken eksik özellikleri varsayılan değerlerle doldur
        settings = {
          searchEngine: result.sidePanelSettings.searchEngine || "google",
          theme: result.sidePanelSettings.theme || "light",
          language: result.sidePanelSettings.language || chrome.i18n.getUILanguage() || "en",
        }
      } else {
        // If no settings found, use browser UI language
        settings.language = chrome.i18n.getUILanguage() || "en"
      }

      // Temayı uygula
      applyTheme(settings.theme)

      // Apply RTL for Arabic language
      if (settings.language === "ar") {
        document.documentElement.setAttribute("dir", "rtl")
      } else {
        document.documentElement.setAttribute("dir", "ltr")
      }

      if (callback) callback()
    })
  } catch (error) {
    console.error("Error in loadSettings:", error)
    if (callback) callback()
  }
}

// Temayı uygula
function applyTheme(theme) {
  document.body.classList.remove("theme-light", "theme-dark")
  document.body.classList.add(`theme-${theme}`)
}

// Save settings to storage - proxy özelliğini kaldır
function saveSettings() {
  try {
    chrome.storage.local.set(
      {
        sidePanelSettings: settings,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving settings:", chrome.runtime.lastError)
        }
      },
    )
  } catch (error) {
    console.error("Error in saveSettings:", error)
  }
}

// Load tabs from storage
function loadTabs(callback) {
  try {
    chrome.storage.local.get(["sidePanelTabs", "activeTabId"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading tabs:", chrome.runtime.lastError)
        // Create a default Google tab
        addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
        if (callback) callback()
        return
      }

      if (result.sidePanelTabs && result.sidePanelTabs.length > 0) {
        tabs = result.sidePanelTabs
        activeTabId = result.activeTabId || tabs[0].id
        renderTabs()
        showTabContent(activeTabId)
      } else {
        // No tabs yet, create a default Google tab
        addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
      }

      if (callback) callback()
    })
  } catch (error) {
    console.error("Error in loadTabs:", error)
    // Fallback if chrome storage is not available
    addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
    if (callback) callback()
  }
}

// Save tabs to storage
function saveTabs() {
  try {
    chrome.storage.local.set(
      {
        sidePanelTabs: tabs,
        activeTabId: activeTabId,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving tabs:", chrome.runtime.lastError)
        }
      },
    )
  } catch (error) {
    console.error("Error in saveTabs:", error)
  }
}

// Create a new tab
function createNewTab() {
  console.log("Creating new tab")
  // Always create a new tab with Google
  addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
}

// Open current tab in side panel
function openCurrentTab() {
  console.log("Opening current tab")
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying tabs:", chrome.runtime.lastError)
        addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
        return
      }

      if (tabs.length > 0) {
        const activeTab = tabs[0]
        console.log("Found active tab:", activeTab)
        addTab(activeTab.url, activeTab.title || chrome.i18n.getMessage("newTab") || "New Tab")
      } else {
        console.log("No active tab found, opening Google")
        addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
      }
    })
  } catch (error) {
    console.error("Error in openCurrentTab:", error)
    addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
  }
}

// Add a new tab
function addTab(url, title) {
  try {
    console.log("Adding new tab with URL:", url)

    // Validate URL
    if (!url || typeof url !== "string") {
      url = "https://www.google.com"
    }

    // Ensure URL has protocol
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url
    }

    const newTab = {
      id: Date.now().toString(),
      url: url,
      title: title || chrome.i18n.getMessage("newTab") || "New Tab",
    }

    // Deactivate all tabs
    tabs.forEach((tab) => (tab.active = false))

    // Add and activate new tab
    newTab.active = true
    tabs.push(newTab)
    activeTabId = newTab.id

    renderTabs()
    showTabContent(newTab.id)
    saveTabs()
  } catch (error) {
    console.error("Error in addTab:", error)
  }
}

// Render tabs in the tab bar - tasarımı güzelleştir
function renderTabs() {
  try {
    if (!tabBar) {
      console.error("Tab bar element not found")
      return
    }

    // Clear existing tabs (except the new tab button)
    while (tabBar.children.length > 1) {
      tabBar.removeChild(tabBar.children[1])
    }

    // Add tabs
    tabs.forEach((tab) => {
      const tabElement = document.createElement("div")
      tabElement.className = `tab ${tab.id === activeTabId ? "active" : ""}`
      tabElement.dataset.tabId = tab.id

      // Favicon ekle
      const favicon = document.createElement("img")
      favicon.className = "tab-favicon"
      try {
        const urlObj = new URL(tab.url)
        favicon.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`
      } catch (e) {
        favicon.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'%3E%3C/path%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'%3E%3C/path%3E%3C/svg%3E"
      }
      favicon.onerror = () => {
        favicon.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'%3E%3C/path%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'%3E%3C/path%3E%3C/svg%3E"
      }

      const tabTitle = document.createElement("span")
      tabTitle.className = "tab-title"
      tabTitle.textContent = tab.title || chrome.i18n.getMessage("newTab") || "New Tab"

      const closeButton = document.createElement("button")
      closeButton.className = "tab-close"
      closeButton.innerHTML = "×"
      closeButton.title = "Close Tab"
      closeButton.onclick = (e) => {
        e.stopPropagation()
        closeTab(tab.id)
      }

      tabElement.appendChild(favicon)
      tabElement.appendChild(tabTitle)
      tabElement.appendChild(closeButton)

      tabElement.onclick = () => activateTab(tab.id)

      tabBar.appendChild(tabElement)
    })

    // Add settings button
    const settingsButton = document.createElement("button")
    settingsButton.id = "settings-button"
    settingsButton.title = chrome.i18n.getMessage("settings") || "Settings"
    settingsButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  `
    settingsButton.onclick = showSettings
    tabBar.appendChild(settingsButton)
  } catch (error) {
    console.error("Error in renderTabs:", error)
  }
}

// showSettings fonksiyonu - proxy özelliğini kaldır ve tasarımı güzelleştir
// Modify the showSettings function to include more language options
function showSettings() {
  try {
    if (!content) {
      console.error("Content element not found")
      return
    }

    content.innerHTML = ""

    const settingsPanel = document.createElement("div")
    settingsPanel.className = "settings-panel"

    settingsPanel.innerHTML = `
    <h2>${chrome.i18n.getMessage("settingsTitle") || "Settings"}</h2>
    
    <div class="settings-section">
      <h3>${chrome.i18n.getMessage("searchEngine") || "Search Engine"}</h3>
      <div class="setting-item">
        <label>${chrome.i18n.getMessage("defaultSearchEngine") || "Default Search Engine:"}</label>
        <div class="search-engines">
          <button class="search-engine-button ${settings.searchEngine === "google" ? "active" : ""}" data-engine="google">
            <span class="search-engine-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v8"></path>
                <path d="M8 12h8"></path>
              </svg>
            </span>
            Google
          </button>
          <button class="search-engine-button ${settings.searchEngine === "bing" ? "active" : ""}" data-engine="bing">
            <span class="search-engine-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </span>
            Bing
          </button>
          <button class="search-engine-button ${settings.searchEngine === "yandex" ? "active" : ""}" data-engine="yandex">
            <span class="search-engine-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </span>
            Yandex
          </button>
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h3>${chrome.i18n.getMessage("appearance") || "Appearance"}</h3>
      <div class="setting-item">
        <label>${chrome.i18n.getMessage("theme") || "Theme:"}</label>
        <div class="theme-selector">
          <button class="theme-button ${settings.theme === "light" ? "active" : ""}" data-theme="light">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            ${chrome.i18n.getMessage("light") || "Light"}
          </button>
          <button class="theme-button ${settings.theme === "dark" ? "active" : ""}" data-theme="dark">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            ${chrome.i18n.getMessage("dark") || "Dark"}
          </button>
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h3>Language</h3>
      <div class="setting-item">
        <label>Language:</label>
        <div class="language-selector">
          <button class="language-button ${settings.language === "en" ? "active" : ""}" data-language="en">English</button>
          <button class="language-button ${settings.language === "tr" ? "active" : ""}" data-language="tr">Türkçe</button>
          <button class="language-button ${settings.language === "ku" ? "active" : ""}" data-language="ku">Kurdî</button>
          <button class="language-button ${settings.language === "es" ? "active" : ""}" data-language="es">Español</button>
          <button class="language-button ${settings.language === "de" ? "active" : ""}" data-language="de">Deutsch</button>
          <button class="language-button ${settings.language === "fr" ? "active" : ""}" data-language="fr">Français</button>
          <button class="language-button ${settings.language === "it" ? "active" : ""}" data-language="it">Italiano</button>
          <button class="language-button ${settings.language === "pt" ? "active" : ""}" data-language="pt">Português</button>
          <button class="language-button ${settings.language === "ru" ? "active" : ""}" data-language="ru">Русский</button>
          <button class="language-button ${settings.language === "zh" ? "active" : ""}" data-language="zh">中文</button>
          <button class="language-button ${settings.language === "ja" ? "active" : ""}" data-language="ja">日本語</button>
          <button class="language-button ${settings.language === "ko" ? "active" : ""}" data-language="ko">한국어</button>
          <button class="language-button ${settings.language === "ar" ? "active" : ""}" data-language="ar">العربية</button>
        </div>
      </div>
    </div>
    
    <div class="settings-actions">
      <button id="save-settings" class="primary-button">${chrome.i18n.getMessage("save") || "Save"}</button>
      <button id="cancel-settings">${chrome.i18n.getMessage("cancel") || "Cancel"}</button>
    </div>
  `

    content.appendChild(settingsPanel)

    // Add event listeners for search engine selection
    const searchEngineButtons = settingsPanel.querySelectorAll(".search-engine-button")
    searchEngineButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons
        searchEngineButtons.forEach((btn) => btn.classList.remove("active"))
        // Add active class to clicked button
        button.classList.add("active")
      })
    })

    // Add event listeners for theme selection
    const themeButtons = settingsPanel.querySelectorAll(".theme-button")
    themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons
        themeButtons.forEach((btn) => btn.classList.remove("active"))
        // Add active class to clicked button
        button.classList.add("active")
      })
    })

    // Add event listeners for language selection
    const languageButtons = settingsPanel.querySelectorAll(".language-button")
    languageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons
        languageButtons.forEach((btn) => btn.classList.remove("active"))
        // Add active class to clicked button
        button.classList.add("active")
      })
    })

    // Add event listeners for save/cancel
    const saveButton = document.getElementById("save-settings")
    const cancelButton = document.getElementById("cancel-settings")

    if (saveButton) {
      saveButton.addEventListener("click", () => {
        try {
          // Get selected search engine
          const activeEngineButton = settingsPanel.querySelector(".search-engine-button.active")
          if (activeEngineButton) {
            settings.searchEngine = activeEngineButton.dataset.engine
          }

          // Get selected theme
          const activeThemeButton = settingsPanel.querySelector(".theme-button.active")
          if (activeThemeButton) {
            settings.theme = activeThemeButton.dataset.theme
            applyTheme(settings.theme)
          }

          // Get selected language
          const activeLanguageButton = settingsPanel.querySelector(".language-button.active")
          if (activeLanguageButton) {
            const newLanguage = activeLanguageButton.dataset.language
            if (newLanguage !== settings.language) {
              settings.language = newLanguage
              // Dil değişikliğini kaydet
              saveSettings()

              // Dil değişikliğini uygulamak için sayfayı yeniden yükle
              // Ancak önce kullanıcıya bilgi ver
              const languageChangeMessage = document.createElement("div")
              languageChangeMessage.className = "language-change-message"
              languageChangeMessage.textContent = "Dil değişikliğini uygulamak için sayfa yenileniyor..."
              languageChangeMessage.style.position = "fixed"
              languageChangeMessage.style.top = "50%"
              languageChangeMessage.style.left = "50%"
              languageChangeMessage.style.transform = "translate(-50%, -50%)"
              languageChangeMessage.style.padding = "20px"
              languageChangeMessage.style.backgroundColor = "var(--bg-color)"
              languageChangeMessage.style.color = "var(--text-color)"
              languageChangeMessage.style.borderRadius = "8px"
              languageChangeMessage.style.boxShadow = "0 4px 12px var(--shadow-color)"
              languageChangeMessage.style.zIndex = "9999"
              document.body.appendChild(languageChangeMessage)

              // Uzantıyı tamamen yeniden yükle
              setTimeout(() => {
                chrome.runtime.reload()
              }, 1000)
              return
            }
          }

          saveSettings()
          showTabContent(activeTabId)
        } catch (error) {
          console.error("Error saving settings:", error)
        }
      })
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        showTabContent(activeTabId)
      })
    }
  } catch (error) {
    console.error("Error in showSettings:", error)
  }
}

// Check if a domain is restricted
function isRestrictedDomain(url) {
  try {
    // URL geçerli değilse veya boşsa, kısıtlı değil olarak kabul et
    if (!url || typeof url !== "string" || url.trim() === "") {
      return false
    }

    // URL'nin geçerli olup olmadığını kontrol et
    let urlObj
    try {
      urlObj = new URL(url)
    } catch (urlError) {
      console.error("Invalid URL format:", url)
      return false
    }

    const restrictedDomains = [
      "mail.google.com",
      "gmail.com",
      "drive.google.com",
      "docs.google.com",
      "accounts.google.com",
      "calendar.google.com",
      "meet.google.com",
      "chat.google.com",
      "classroom.google.com",
      "photos.google.com",
    ]

    return restrictedDomains.some((domain) => urlObj.hostname.includes(domain))
  } catch (e) {
    console.error("Error checking restricted domain:", e)
    return false
  }
}

// Initialize custom search functionality - tasarımı güzelleştir
function initializeCustomSearch() {
  try {
    const searchContainer = document.getElementById("custom-search")
    if (!searchContainer) {
      console.error("Search container not found")
      return
    }

    // Create custom search UI
    searchContainer.innerHTML = `
    <div class="search-box">
      <input type="text" id="search-input" placeholder="${chrome.i18n.getMessage("searchPlaceholder") || "Search the web..."}">
      <button id="search-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>
    <div class="search-engines">
      <button class="search-engine-button ${settings.searchEngine === "google" ? "active" : ""}" data-engine="google">
        <span class="search-engine-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 8v8"></path>
            <path d="M8 12h8"></path>
          </svg>
        </span>
        Google
      </button>
      <button class="search-engine-button ${settings.searchEngine === "bing" ? "active" : ""}" data-engine="bing">
        <span class="search-engine-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
          </svg>
        </span>
        Bing
      </button>
      <button class="search-engine-button ${settings.searchEngine === "yandex" ? "active" : ""}" data-engine="yandex">
        <span class="search-engine-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </span>
        Yandex
      </button>
    </div>
    <div id="search-results"></div>
  `

    // Add event listener for search
    const searchInput = document.getElementById("search-input")
    const searchButton = document.getElementById("search-button")

    if (searchButton && searchInput) {
      searchButton.addEventListener("click", () => performDirectSearch(searchInput.value))
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          performDirectSearch(searchInput.value)
        }
      })
    }

    // Add event listeners for search engine selection
    const searchEngineButtons = searchContainer.querySelectorAll(".search-engine-button")
    searchEngineButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons
        searchEngineButtons.forEach((btn) => btn.classList.remove("active"))
        // Add active class to clicked button
        button.classList.add("active")
        // Update current search engine
        settings.searchEngine = button.dataset.engine
        saveSettings()
      })
    })
  } catch (error) {
    console.error("Error in initializeCustomSearch:", error)
  }
}

// Show tab content - proxy özelliğini kaldır ve tasarımı güzelleştir
function showTabContent(tabId) {
  try {
    if (!content) {
      console.error("Content element not found")
      return
    }

    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) {
      console.error("Tab not found:", tabId)
      return
    }

    content.innerHTML = ""

    // Create navigation bar
    const navBar = document.createElement("div")
    navBar.id = "nav-bar"

    const backButton = document.createElement("button")
    backButton.className = "nav-button"
    backButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5"></path>
      <path d="M12 19l-7-7 7-7"></path>
    </svg>
  `
    backButton.title = chrome.i18n.getMessage("back") || "Back"
    backButton.onclick = () => navigateFrame("back")

    const forwardButton = document.createElement("button")
    forwardButton.className = "nav-button"
    forwardButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14"></path>
      <path d="M12 5l7 7-7 7"></path>
    </svg>
  `
    forwardButton.title = chrome.i18n.getMessage("forward") || "Forward"
    forwardButton.onclick = () => navigateFrame("forward")

    const refreshButton = document.createElement("button")
    refreshButton.className = "nav-button"
    refreshButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 4v6h-6"></path>
      <path d="M1 20v-6h6"></path>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
    </svg>
  `
    refreshButton.title = chrome.i18n.getMessage("refresh") || "Refresh"
    refreshButton.onclick = () => navigateFrame("refresh")

    const urlInput = document.createElement("input")
    urlInput.id = "url-input"
    urlInput.type = "text"
    urlInput.value = tab.url
    urlInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        navigateToUrl(urlInput.value)
      }
    }

    navBar.appendChild(backButton)
    navBar.appendChild(forwardButton)
    navBar.appendChild(refreshButton)
    navBar.appendChild(urlInput)

    // URL'nin geçerli olup olmadığını kontrol et
    let isValidUrl = true
    try {
      new URL(tab.url)
    } catch (e) {
      isValidUrl = false
      console.error("Invalid URL in tab:", tab.url)
    }

    // Check if this is a restricted domain
    if (isValidUrl && isRestrictedDomain(tab.url)) {
      content.appendChild(navBar)

      // Show restricted content message with direct search interface
      const restrictedMessage = document.createElement("div")
      restrictedMessage.className = "restricted-content"
      restrictedMessage.innerHTML = `
      <div class="restricted-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3>${chrome.i18n.getMessage("restrictedPageTitle") || "This page cannot be opened in the side panel"}</h3>
      <p>${chrome.i18n.getMessage("restrictedPageDescription") || "Gmail, Google Drive, and some secure sites are restricted in the side panel for security reasons."}</p>
      <p>${chrome.i18n.getMessage("openInRegularTab") || "Please open this page in a regular tab."}</p>
      <div class="search-container">
        <h4>${chrome.i18n.getMessage("searchWeb") || "Search the Web"}</h4>
        <div id="custom-search"></div>
      </div>
    `

      content.appendChild(restrictedMessage)

      // Initialize custom search
      setTimeout(() => {
        initializeCustomSearch()
      }, 100)

      return
    }

    // Create iframe for non-restricted content
    const iframe = document.createElement("iframe")
    iframe.id = "browser-frame"
    iframe.src = tab.url
    iframe.sandbox = "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    iframe.allow = "clipboard-read; clipboard-write"

    // Update tab title and URL when iframe loads
    iframe.onload = () => {
      try {
        // URL çubuğunu güncelle - iframe'in gerçek URL'si ile
        try {
          // Cross-origin kısıtlamaları nedeniyle contentDocument erişilemeyebilir
          // Bu durumda iframe'in src özelliğini kullanırız
          const currentUrl = iframe.contentWindow.location.href || iframe.src
          urlInput.value = currentUrl
          tab.url = currentUrl
        } catch (e) {
          console.log("Could not access iframe URL due to cross-origin restrictions")
        }

        // Başlığı güncelle
        const title = iframe.contentDocument?.title
        if (title) {
          tab.title = title
          renderTabs()
          saveTabs()
        } else {
          // Cross-origin restrictions may prevent access
          // Use URL as fallback for title
          try {
            const urlObj = new URL(tab.url)
            tab.title = urlObj.hostname
            renderTabs()
            saveTabs()
          } catch (err) {
            // Invalid URL, keep existing title
            console.error("Error updating tab title:", err)
          }
        }
      } catch (e) {
        console.error("Error in iframe onload:", e)
      }
    }

    // Handle iframe errors
    iframe.onerror = () => {
      console.error("Error loading iframe content")
      showNavigationError()
    }

    content.appendChild(navBar)
    content.appendChild(iframe)
  } catch (error) {
    console.error("Error in showTabContent:", error)
    showNavigationError()
  }
}

// Show navigation error - tasarımı güzelleştir
function showNavigationError() {
  try {
    if (!content) return

    // Keep the nav bar if it exists
    const navBar = document.getElementById("nav-bar")
    const errorMessage = document.createElement("div")
    errorMessage.className = "navigation-error"
    errorMessage.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <p>${chrome.i18n.getMessage("errorLoadingPage") || "This page is not working properly in the side panel."}</p>
    <p>${chrome.i18n.getMessage("restrictedSites") || "Gmail, Google Drive, and some secure sites may be restricted in the side panel."}</p>
    <button class="retry-button">${chrome.i18n.getMessage("retry") || "Retry"}</button>
  `

    content.innerHTML = ""
    if (navBar) content.appendChild(navBar)
    content.appendChild(errorMessage)

    // Add retry button functionality
    const retryButton = errorMessage.querySelector(".retry-button")
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        showTabContent(activeTabId)
      })
    }
  } catch (error) {
    console.error("Error showing navigation error:", error)
  }
}

// Get search URL based on selected search engine
function getSearchUrl(query, engine) {
  try {
    const encodedQuery = encodeURIComponent(query)

    switch (engine) {
      case "bing":
        return `https://www.bing.com/search?q=${encodedQuery}`
      case "yandex":
        return `https://yandex.com/search/?text=${encodedQuery}`
      case "google":
      default:
        return `https://www.google.com/search?q=${encodedQuery}`
    }
  } catch (error) {
    console.error("Error getting search URL:", error)
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`
  }
}

// Perform direct search - proxy özelliğini kaldır
function performDirectSearch(query) {
  try {
    if (!query) return

    // Create search URL based on selected search engine
    const searchUrl = getSearchUrl(query, settings.searchEngine)

    // Create a new tab with the search results
    addTab(searchUrl, `${chrome.i18n.getMessage("searchWeb") || "Search"}: ${query}`)
  } catch (error) {
    console.error("Error performing search:", error)
  }
}

// Navigate iframe
function navigateFrame(action) {
  try {
    const iframe = document.getElementById("browser-frame")
    if (!iframe) {
      console.error("Browser frame not found")
      return
    }

    if (action === "refresh") {
      iframe.src = iframe.src
    } else if (action === "back" || action === "forward") {
      // Use postMessage to communicate with the iframe if possible
      try {
        iframe.contentWindow.postMessage(
          {
            action: action === "back" ? "goBack" : "goForward",
            source: "side-panel-extension",
          },
          "*",
        )
      } catch (innerError) {
        console.log("Could not send postMessage, refreshing instead:", innerError)
        iframe.src = iframe.src
      }
    }
  } catch (e) {
    console.error("Navigation error:", e)
    showNavigationError()
  }
}

// Navigate to URL
function navigateToUrl(url) {
  try {
    // URL boşsa, seçili arama motoruna yönlendir
    if (!url || url.trim() === "") {
      let searchUrl = ""
      switch (settings.searchEngine) {
        case "bing":
          searchUrl = "https://www.bing.com"
          break
        case "yandex":
          searchUrl = "https://yandex.com"
          break
        case "google":
        default:
          searchUrl = "https://www.google.com"
          break
      }
      url = searchUrl
    }

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url
    }

    const tab = tabs.find((t) => t.id === activeTabId)
    if (tab) {
      tab.url = url
      showTabContent(activeTabId)
      saveTabs()
    }
  } catch (error) {
    console.error("Error navigating to URL:", error)
  }
}

// Activate a tab
function activateTab(tabId) {
  try {
    // Deactivate all tabs
    tabs.forEach((tab) => (tab.active = false))

    // Activate selected tab
    const tab = tabs.find((tab) => tab.id === tabId)
    if (tab) {
      tab.active = true
      activeTabId = tabId

      renderTabs()
      showTabContent(tabId)
      saveTabs()
    }
  } catch (error) {
    console.error("Error activating tab:", error)
  }
}

// Close a tab
function closeTab(tabId) {
  try {
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId)
    if (tabIndex === -1) return

    // Remove tab
    tabs.splice(tabIndex, 1)

    // If we closed the active tab, activate another tab
    if (activeTabId === tabId) {
      if (tabs.length > 0) {
        // Activate the tab to the left, or the first tab if there is none
        const newIndex = Math.max(0, tabIndex - 1)
        activeTabId = tabs[newIndex].id
        tabs[newIndex].active = true

        renderTabs()
        showTabContent(activeTabId)
      } else {
        // No tabs left, create a new Google tab
        addTab("https://www.google.com", chrome.i18n.getMessage("newTab") || "New Tab")
      }
    } else {
      renderTabs()
    }

    saveTabs()
  } catch (error) {
    console.error("Error closing tab:", error)
  }
}

// CSS ekle - tasarımı güzelleştir
document.addEventListener("DOMContentLoaded", () => {
  // Yeni stil ekle
  const style = document.createElement("style")
  style.textContent = `
    /* Tema değişkenleri */
    :root {
      --bg-color: #ffffff;
      --text-color: #333333;
      --border-color: #e0e0e0;
      --hover-color: #f5f5f5;
      --active-color: #e8f0fe;
      --active-border: #4285f4;
      --button-bg: #f5f5f5;
      --button-hover: #e0e0e0;
      --primary-button: #4285f4;
      --primary-button-hover: #3367d6;
      --tab-bg: #f0f0f0;
      --tab-active-bg: #ffffff;
      --input-bg: #ffffff;
      --shadow-color: rgba(0, 0, 0, 0.1);
    }
    
    /* Koyu tema */
    .theme-dark {
      --bg-color: #202124;
      --text-color: #e8eaed;
      --border-color: #3c4043;
      --hover-color: #303134;
      --active-color: #303134;
      --active-border: #8ab4f8;
      --button-bg: #303134;
      --button-hover: #3c4043;
      --primary-button: #8ab4f8;
      --primary-button-hover: #669df6;
      --tab-bg: #303134;
      --tab-active-bg: #202124;
      --input-bg: #303134;
      --shadow-color: rgba(0, 0, 0, 0.3);
    }
    
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
        "Helvetica Neue", sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      transition: background-color 0.3s, color 0.3s;
    }
    
    #container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--bg-color);
    }
    
    /* Tab bar tasarımı */
    #tab-bar {
      display: flex;
      background-color: var(--tab-bg);
      border-bottom: 1px solid var(--border-color);
      padding: 6px 8px;
      overflow-x: auto;
      white-space: nowrap;
      align-items: center;
      height: 36px;
    }
    
    .tab {
      display: flex;
      align-items: center;
      min-width: 100px;
      max-width: 200px;
      height: 32px;
      margin: 0 4px 0 0;
      padding: 0 8px;
      background-color: var(--tab-bg);
      border-radius: 8px;
      cursor: pointer;
      overflow: hidden;
      position: relative;
      transition: background-color 0.2s;
    }
    
    .tab:hover {
      background-color: var(--hover-color);
    }
    
    .tab.active {
      background-color: var(--tab-active-bg);
      border: 1px solid var(--active-border);
    }
    
    .tab-favicon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      flex-shrink: 0;
    }
    
    .tab-title {
      flex-grow: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: var(--text-color);
    }
    
    .tab-close {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      padding: 0 4px;
      color: var(--text-color);
      opacity: 0.6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-left: 4px;
      transition: opacity 0.2s, background-color 0.2s;
    }
    
    .tab-close:hover {
      opacity: 1;
      background-color: var(--button-hover);
    }
    
    #new-tab-button {
      width: 28px;
      height: 28px;
      background-color: var(--button-bg);
      border: none;
      border-radius: 50%;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      color: var(--text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    #new-tab-button:hover {
      background-color: var(--button-hover);
    }
    
    #content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background-color: var(--bg-color);
    }
    
    /* Navigation bar tasarımı */
    #nav-bar {
      display: flex;
      height: 40px;
      background-color: var(--bg-color);
      border-bottom: 1px solid var(--border-color);
      padding: 0 8px;
      align-items: center;
    }
    
    .nav-button {
      width: 32px;
      height: 32px;
      margin: 0 4px;
      background-color: var(--button-bg);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      color: var(--text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    .nav-button:hover {
      background-color: var(--button-hover);
    }
    
    #url-input {
      flex-grow: 1;
      height: 32px;
      margin: 0 8px;
      padding: 0 12px;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      font-size: 13px;
      background-color: var(--input-bg);
      color: var(--text-color);
      transition: border-color 0.2s;
    }
    
    #url-input:focus {
      outline: none;
      border-color: var(--active-border);
    }
    
    #browser-frame {
      flex-grow: 1;
      width: 100%;
      border: none;
      background-color: var(--bg-color);
    }
    
    /* Empty state tasarımı */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 20px;
      color: var(--text-color);
      background-color: var(--bg-color);
    }
    
    .empty-state h3 {
      margin-bottom: 16px;
      font-size: 20px;
      font-weight: 500;
    }
    
    .empty-state p {
      margin-bottom: 24px;
      max-width: 300px;
      font-size: 14px;
      opacity: 0.8;
    }
    
    .empty-state button {
      padding: 10px 20px;
      background-color: var(--primary-button);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .empty-state button:hover {
      background-color: var(--primary-button-hover);
    }
    
    /* Restricted content ve search tasarımı */
    .restricted-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 40px 20px;
      text-align: center;
      height: 100%;
      overflow-y: auto;
      background-color: var(--bg-color);
    }
    
    .restricted-icon {
      margin-bottom: 20px;
      color: #f44336;
    }
    
    .restricted-content h3 {
      margin: 0 0 16px 0;
      color: #f44336;
      font-size: 18px;
      font-weight: 500;
    }
    
    .restricted-content p {
      margin: 0 0 12px 0;
      max-width: 400px;
      color: var(--text-color);
      font-size: 14px;
      opacity: 0.8;
    }
    
    .search-container {
      width: 100%;
      max-width: 500px;
      margin-top: 30px;
      padding: 20px;
      border-radius: 12px;
      background-color: var(--hover-color);
      box-shadow: 0 2px 8px var(--shadow-color);
    }
    
    .search-container h4 {
      margin: 0 0 16px 0;
      color: var(--text-color);
      font-weight: 500;
      font-size: 16px;
    }
    
    .search-box {
      display: flex;
      width: 100%;
      height: 40px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 2px 5px var(--shadow-color);
      background-color: var(--input-bg);
      border: 1px solid var(--border-color);
    }
    
    #search-input {
      flex-grow: 1;
      border: none;
      padding: 0 16px;
      font-size: 14px;
      outline: none;
      background-color: var(--input-bg);
      color: var(--text-color);
    }
    
    #search-button {
      width: 40px;
      height: 40px;
      background-color: var(--primary-button);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    #search-button:hover {
      background-color: var(--primary-button-hover);
    }
    
    /* Search engines tasarımı */
    .search-engines {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    
    .search-engine-button {
      padding: 6px 12px;
      border-radius: 16px;
      background-color: var(--button-bg);
      border: 1px solid var(--border-color);
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--text-color);
      transition: all 0.2s;
    }
    
    .search-engine-button:hover {
      background-color: var(--button-hover);
    }
    
    .search-engine-button.active {
      background-color: var(--active-color);
      border-color: var(--active-border);
      color: var(--active-border);
    }
    
    .search-engine-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Navigation error tasarımı */
    .navigation-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: var(--text-color);
      background-color: var(--bg-color);
      height: 100%;
    }
    
    .navigation-error svg {
      color: #f44336;
      margin-bottom: 20px;
    }
    
    .navigation-error p {
      margin: 0 0 12px 0;
      color: var(--text-color);
      font-size: 14px;
    }
    
    .retry-button {
      margin-top: 16px;
      padding: 8px 16px;
      background-color: var(--primary-button);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .retry-button:hover {
      background-color: var(--primary-button-hover);
    }
    
    /* Settings panel tasarımı */
    .settings-panel {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
      background-color: var(--bg-color);
      color: var(--text-color);
      overflow-y: auto;
    }
    
    .settings-panel h2 {
      margin-top: 0;
      margin-bottom: 24px;
      color: var(--text-color);
      font-size: 22px;
      font-weight: 500;
    }
    
    .settings-section {
      margin-bottom: 32px;
      padding: 20px;
      background-color: var(--hover-color);
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }
    
    .settings-section h3 {
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--text-color);
      font-size: 16px;
      font-weight: 500;
    }
    
    .setting-item {
      margin-bottom: 16px;
    }
    
    .setting-item label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-color);
    }
    
    .setting-help {
      font-size: 12px;
      color: var(--text-color);
      opacity: 0.7;
      margin-top: 8px;
    }

    .settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    
    .settings-actions button {
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .primary-button {
      background-color: var(--primary-button);
      color: white;
    }
    
    .primary-button:hover {
      background-color: var(--primary-button-hover);
    }
    
    #settings-button {
      width: 32px;
      height: 32px;
      background-color: var(--button-bg);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      color: var(--text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      transition: background-color 0.2s;
    }
    
    #settings-button:hover {
      background-color: var(--button-hover);
    }
    
    /* Tema seçici */
    .theme-selector {
      display: flex;
      gap: 10px;
    }
    
    .theme-button {
      padding: 8px 16px;
      border-radius: 16px;
      background-color: var(--button-bg);
      border: 1px solid var(--border-color);
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-color);
      transition: all 0.2s;
    }
    
    .theme-button:hover {
      background-color: var(--button-hover);
    }
    
    .theme-button.active {
      background-color: var(--active-color);
      border-color: var(--active-border);
      color: var(--active-border);
    }
    
/* Language selector */
.language-selector {
  display: flex;
  gap: 10px;
}

.language-button {
  padding: 8px 16px;
  border-radius: 16px;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color);
  transition: all 0.2s;
}

.language-button:hover {
  background-color: var(--button-hover);
}

.language-button.active {
  background-color: var(--active-color);
  border-color: var(--active-border);
  color: var(--active-border);
}
    
    /* Scrollbar tasarımı */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: var(--bg-color);
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: var(--button-hover);
    }
    
    /* Animasyonlar */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .tab, .nav-button, #search-button, .search-engine-button, .theme-button {
      transition: all 0.2s ease;
    }
    
    #browser-frame {
      animation: fadeIn 0.3s ease;
    }
  `
  document.head.appendChild(style)
})

// Update the CSS for the language selector to handle more languages
document.addEventListener("DOMContentLoaded", () => {
  // Add to the existing style element
  const additionalStyles = `
    /* Updated Language selector for multiple languages */
    .language-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      max-width: 100%;
      margin-bottom: 10px;
    }

    .language-button {
      padding: 8px 12px;
      border-radius: 16px;
      background-color: var(--button-bg);
      border: 1px solid var(--border-color);
      cursor: pointer;
      font-size: 13px;
      color: var(--text-color);
      transition: all 0.2s;
      margin-bottom: 8px;
    }

    .language-button:hover {
      background-color: var(--button-hover);
    }

    .language-button.active {
      background-color: var(--active-color);
      border-color: var(--active-border);
      color: var(--active-border);
    }
    
    /* RTL support for Arabic language */
    [dir="rtl"] {
      text-align: right;
    }
    
    /* For languages with longer text */
    .settings-section {
      overflow-y: auto;
      max-height: 300px;
    }
  `

  // Find the existing style element or create a new one
  const styleElement = document.querySelector("style")
  if (styleElement) {
    styleElement.textContent += additionalStyles
  }
})


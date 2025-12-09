const THEME_KEY = "theme"

const ThemeManager = {
  constructor() {
    this.currentTheme = localStorage.getItem(THEME_KEY) || "dark"
    this.applyTheme()
  },

  applyTheme() {
    const html = document.documentElement
    if (this.currentTheme === "light") {
      html.classList.add("light-theme")
    } else {
      html.classList.remove("light-theme")
    }
  },

  toggle() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark"
    localStorage.setItem(THEME_KEY, this.currentTheme)
    this.applyTheme()
    this.updateThemeButtonIcon()
  },

  updateThemeButtonIcon() {
    const btn = document.getElementById("themeToggle")
    if (btn) {
      btn.textContent = this.currentTheme === "dark" ? "☀️" : "🌙"
    }
  }
}
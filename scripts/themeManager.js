class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem("fluxTheme") || "dark"
    this.applyTheme()
  }

  applyTheme() {
    const html = document.documentElement
    if (this.currentTheme === "light") {
      html.classList.add("light-theme")
    } else {
      html.classList.remove("light-theme")
    }
  }

  toggle() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark"
    localStorage.setItem("fluxTheme", this.currentTheme)
    this.applyTheme()
    this.updateThemeButtonIcon()
  }

  updateThemeButtonIcon() {
    const btn = document.getElementById("themeToggle")
    if (btn) {
      btn.textContent = this.currentTheme === "dark" ? "☀️" : "🌙"
    }
  }
}
const STORAGE_KEY = "fluxDiagrams"
// ============ Storage Management ============
const DiagramStorage = {
  getAllDiagrams() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      const diagrams = JSON.parse(data)
      return diagrams.sort((a, b) => b.modifiedAt - a.modifiedAt)
    } catch (error) {
      console.error("Error loading diagrams:", error)
      return []
    }
  },

  getDiagram(id) {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return null
      const diagrams = JSON.parse(data)
      return diagrams.find((d) => d.id === id) || null
    } catch (error) {
      console.error("Error loading diagram:", error)
      return null
    }
  },

  saveDiagram(diagram) {
    try {
      const existing = localStorage.getItem(STORAGE_KEY)
      const diagrams = existing ? JSON.parse(existing) : []

      const index = diagrams.findIndex((d) => d.id === diagram.id)
      if (index >= 0) {
        diagrams[index] = diagram
      } else {
        diagrams.push(diagram)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams))
    } catch (error) {
      console.error("Error saving diagram:", error)
      throw new Error("Failed to save diagram")
    }
  },

  deleteDiagram(id) {
    try {
      const existing = localStorage.getItem(STORAGE_KEY)
      if (!existing) return

      let diagrams = JSON.parse(existing)
      diagrams = diagrams.filter((d) => d.id !== id)

      localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams))
    } catch (error) {
      console.error("Error deleting diagram:", error)
    }
  },

  exportDiagram(diagram) {
    return JSON.stringify(diagram, null, 2)
  },

  importDiagram(jsonString) {
    try {
      const diagram = JSON.parse(jsonString)
      if (!diagram.name || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
        throw new Error("Invalid diagram format")
      }
      return diagram
    } catch (error) {
      console.error("Error importing diagram:", error)
      throw new Error("Failed to import diagram")
    }
  },
}
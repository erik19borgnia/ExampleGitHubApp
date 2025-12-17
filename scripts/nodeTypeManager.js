const CUSTOM_NODES_KEY = "customNodes"

class NodeTypeManager {
  constructor(canvasInstance) {
    this.canvasInstance = canvasInstance
    this.customTypes = this.loadCustomTypes()
    this.defaultTypes = {
      start: { inputs: 0, outputs: 1, label: "Start", shape: "circle", shapeColor: "#10b981" },
      process: { inputs: 1, outputs: 1, label: "Process", shape: "rectangle", shapeColor: "#3b82f6" },
      decision: { inputs: 1, outputs: 2, label: "Decision", shape: "diamond", shapeColor: "#f59e0b" },
      end: { inputs: 1, outputs: 0, label: "End", shape: "circle", shapeColor: "#b82626ff" },
    }
  }

  getAllTypes() {
    return { ...this.defaultTypes, ...this.customTypes }
  }

  getType(name) {
    const types = this.getAllTypes()
    return types[name] || null
  }

  addCustomType(name, inputs, outputs, shape = "rectangle", shapeColor = "#8b5cf6") {
    if (!name || name.trim() === "") return false
    if (this.customTypes[name] || this.defaultTypes[name]) return false

    this.customTypes[name] = {
      inputs: Math.min(Math.max(Number.parseInt(inputs) || 1, 0), 10),
      outputs: Math.min(Math.max(Number.parseInt(outputs) || 1, 0), 10),
      label: name,
      shape: shape,
      shapeColor: shapeColor,
      customImage: null,
    }
    this.saveCustomTypes()
    return true
  }

  updateNodeTypeShape(typeName, shape, shapeColor = null) {
    const type = this.getType(typeName)
    if (type) {
      type.shape = shape
      if (shapeColor) type.shapeColor = shapeColor
      if (this.customTypes[typeName]) {
        this.saveCustomTypes()
      }
    }
  }

  setNodeTypeImage(typeName, imageData) {
    const type = this.getType(typeName)
    if (type) {
      type.customImage = imageData
      if (this.customTypes[typeName]) {
        this.saveCustomTypes()
      }
    }
  }

  loadCustomTypes() {
    const saved = localStorage.getItem(CUSTOM_NODES_KEY)
    return saved ? JSON.parse(saved) : {}
  }

  saveCustomTypes() {
    localStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(this.customTypes))
  }

  removeCustomType(name) {
    const isTypeInUse = this.canvasInstance && this.canvasInstance.state.nodes.some((node) => node.type === name)

    if (isTypeInUse) {
      alert(
        `Cannot delete "${name}" - it is currently used by ${this.canvasInstance.state.nodes.filter((n) => n.type === name).length} node(s) in the diagram.`,
      )
      return
    }

    if (this.customTypes[name]) {
      delete this.customTypes[name]
      this.saveCustomTypes()
    }
  }
}
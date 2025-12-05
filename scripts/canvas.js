const GRID_SIZE = 20
const NODE_WIDTH = 120
const NODE_HEIGHT = 60
const PORT_RADIUS = 6

// ============ Canvas Management ============
class DiagramCanvas {
  constructor(canvasElement, nodeTypeManager) {
    this.canvas = canvasElement
    this.ctx = canvasElement.getContext("2d")
    this.nodeTypeManager = nodeTypeManager
    nodeTypeManager.canvasInstance = this

    this.state = {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedWaypointIndex: null,
      isDraggingNode: false,
      dragStart: null,
      isDrawingEdge: false,
      edgeStart: null,
      isPanningCanvas: false,
      panStart: null,
    }
    this.zoomLevel = 1
    this.panOffset = { x: 0, y: 0 }

    this.setupCanvas()
    this.setupEventListeners()
  }

  setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    window.addEventListener("resize", () => this.resizeCanvas())
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.render()
  }

  setupEventListeners() {
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e))
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e))
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e))
    this.canvas.addEventListener("contextmenu", (e) => this.handleContextMenu(e))
    this.canvas.addEventListener("wheel", (e) => this.handleWheel(e))
    this.canvas.addEventListener("dblclick", (e) => this.handleDoubleClick(e))
    document.addEventListener("keydown", (e) => this.handleKeyDown(e))
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - this.panOffset.x) / this.zoomLevel,
      y: (e.clientY - rect.top - this.panOffset.y) / this.zoomLevel,
    }
  }

  getPortPosition(node, isOutput, portIndex) {
    const typeConfig = this.nodeTypeManager.getType(node.type)
    if (!typeConfig) return null

    const totalPorts = isOutput ? typeConfig.outputs : typeConfig.inputs
    if (totalPorts === 0) return null

    const portSpacing = node.width / (totalPorts + 1)
    const offsetX = portSpacing * (portIndex + 1)

    if (isOutput) {
      // Output ports on bottom
      return {
        x: node.position.x - node.width / 2 + offsetX,
        y: node.position.y + node.height / 2,
      }
    } else {
      // Input ports on top
      return {
        x: node.position.x - node.width / 2 + offsetX,
        y: node.position.y - node.height / 2,
      }
    }
  }

  getPortAtPosition(pos) {
    for (let i = this.state.nodes.length - 1; i >= 0; i--) {
      const node = this.state.nodes[i]
      const typeConfig = this.nodeTypeManager.getType(node.type)
      if (!typeConfig) continue

      // Check output ports
      for (let j = 0; j < typeConfig.outputs; j++) {
        const portPos = this.getPortPosition(node, true, j)
        if (portPos) {
          const dx = pos.x - portPos.x
          const dy = pos.y - portPos.y
          if (Math.sqrt(dx * dx + dy * dy) <= PORT_RADIUS) {
            return { nodeId: node.id, isOutput: true, portIndex: j }
          }
        }
      }

      // Check input ports
      for (let j = 0; j < typeConfig.inputs; j++) {
        const portPos = this.getPortPosition(node, false, j)
        if (portPos) {
          const dx = pos.x - portPos.x
          const dy = pos.y - portPos.y
          if (Math.sqrt(dx * dx + dy * dy) <= PORT_RADIUS) {
            return { nodeId: node.id, isOutput: false, portIndex: j }
          }
        }
      }
    }
    return null
  }

  handleMouseDown(e) {
    const isSpacePressed = e.shiftKey || e.button === 1
    const mousePos = this.getMousePos(e)

    if (isSpacePressed) {
      this.state.isPanningCanvas = true
      this.state.panStart = { x: e.clientX, y: e.clientY }
      this.canvas.classList.add("panning")
      return
    }

    this.canvas.classList.remove("panning")
    this.state.isPanningCanvas = false

    const waypointHit = this.getWaypointAtPosition(mousePos)
    if (waypointHit) {
      this.state.selectedEdgeId = this.state.edges[waypointHit.edgeIndex].id
      this.state.selectedWaypointIndex = waypointHit.waypointIndex
      this.state.isDraggingNode = true
      this.state.dragStart = { x: mousePos.x, y: mousePos.y, isWaypoint: true }
      this.render()
      return
    }

    const edgeHit = this.getEdgeAtPosition(mousePos)
    if (edgeHit !== null) {
      this.state.selectedEdgeId = this.state.edges[edgeHit].id
      this.state.selectedNodeId = null
      this.state.selectedWaypointIndex = null
      this.render()
      return
    }

    const port = this.getPortAtPosition(mousePos)
    if (port) {
      this.state.isDrawingEdge = true
      this.state.edgeStart = port
      this.state.selectedEdgeId = null
      this.state.selectedNodeId = null
      return
    }

    const node = this.getNodeAtPosition(mousePos)
    if (node) {
      this.state.selectedNodeId = node.id
      this.state.selectedEdgeId = null
      this.state.selectedWaypointIndex = null
      this.state.isDraggingNode = true
      this.state.dragStart = { x: mousePos.x - node.position.x, y: mousePos.y - node.position.y }
      this.render()
      return
    }

    this.state.selectedNodeId = null
    this.state.selectedEdgeId = null
    this.state.selectedWaypointIndex = null
    this.render()
  }

  handleMouseMove(e) {
    if (this.state.isPanningCanvas) {
      const deltaX = e.clientX - this.state.panStart.x
      const deltaY = e.clientY - this.state.panStart.y
      this.panOffset.x += deltaX
      this.panOffset.y += deltaY
      this.state.panStart = { x: e.clientX, y: e.clientY }
      this.render()
      return
    }

    const mousePos = this.getMousePos(e)

    if (this.state.isDraggingNode && this.state.dragStart && this.state.dragStart.isWaypoint) {
      const edge = this.state.edges.find((e) => e.id === this.state.selectedEdgeId)
      if (edge && edge.waypoints && this.state.selectedWaypointIndex !== null) {
        edge.waypoints[this.state.selectedWaypointIndex] = { x: mousePos.x, y: mousePos.y }
      }
      this.render()
      return
    }

    if (this.state.isDraggingNode) {
      const node = this.state.nodes.find((n) => n.id === this.state.selectedNodeId)
      if (node) {
        node.position.x = mousePos.x - this.state.dragStart.x
        node.position.y = mousePos.y - this.state.dragStart.y
      }
      this.render()
      return
    }

    if (this.state.isDrawingEdge) {
      this.render()
      const offsetX = this.panOffset.x * this.zoomLevel
      const offsetY = this.panOffset.y * this.zoomLevel
      const startPort = this.state.edgeStart
      const startNode = this.state.nodes.find((n) => n.id === startPort.nodeId)
      if (startNode) {
        const startPos = this.getPortPosition(startNode, startPort.isOutput, startPort.portIndex)
        if (startPos) {
          this.ctx.strokeStyle = "#64748b"
          this.ctx.lineWidth = 2
          this.ctx.beginPath()
          this.ctx.moveTo(startPos.x + offsetX, startPos.y + offsetY)
          this.ctx.lineTo(mousePos.x + offsetX, mousePos.y + offsetY)
          this.ctx.stroke()
        }
      }
      return
    }

    this.canvas.style.cursor = this.getPortAtPosition(mousePos) ? "pointer" : "default"
  }

  handleMouseUp(e) {
    if (this.state.isPanningCanvas) {
      this.state.isPanningCanvas = false
      this.canvas.classList.remove("panning")
      return
    }

    const mousePos = this.getMousePos(e)

    if (this.state.isDraggingNode && this.state.dragStart && this.state.dragStart.isWaypoint) {
      this.state.isDraggingNode = false
      this.state.dragStart = null
      return
    }

    if (this.state.isDrawingEdge) {
      const port = this.getPortAtPosition(mousePos)
      if (port && !port.isOutput && this.state.edgeStart.isOutput) {
        if (port.nodeId !== this.state.edgeStart.nodeId) {
          const existingConnection = this.state.edges.find(
            (edge) =>
              edge.from.nodeId === this.state.edgeStart.nodeId &&
              edge.from.portIndex === this.state.edgeStart.portIndex,
          )

          if (!existingConnection) {
            this.state.edges = this.state.edges.filter(
              (edge) => !(edge.to.nodeId === port.nodeId && edge.to.portIndex === port.portIndex),
            )

            this.state.edges.push({
              id: `edge-${Date.now()}`,
              from: this.state.edgeStart,
              to: port,
              waypoints: [],
            })
          }
        }
      }
      this.state.isDrawingEdge = false
      this.state.edgeStart = null
      this.render()
      return
    }

    this.state.isDraggingNode = false
    this.state.dragStart = null
  }

  getNodeAtPosition(pos) {
    for (let i = this.state.nodes.length - 1; i >= 0; i--) {
      const node = this.state.nodes[i]
      if (this.isPointInNode(pos, node)) {
        return node
      }
    }
    return null
  }

  isPointInNode(pos, node) {
    const dx = pos.x - node.position.x
    const dy = pos.y - node.position.y
    return Math.abs(dx) <= node.width / 2 && Math.abs(dy) <= node.height / 2
  }

  render() {
    this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--canvas-bg").trim()
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.save()
    this.ctx.translate(this.panOffset.x, this.panOffset.y)
    this.ctx.scale(this.zoomLevel, this.zoomLevel)

    this.drawGrid()
    this.drawEdges()
    this.drawNodes()

    /*if (this.state.isDrawingEdge && this.state.edgeStart) {
      const edgeColor = getComputedStyle(document.documentElement).getPropertyValue("--edge-color").trim()
      this.ctx.strokeStyle = edgeColor || "#64748b"
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([5, 5])
      const startNode = this.state.nodes.find((n) => n.id === this.state.edgeStart.nodeId)
      if (startNode) {
        const portPos = this.getPortPosition(startNode, true, this.state.edgeStart.portIndex)
        this.ctx.beginPath()
        this.ctx.moveTo(portPos.x, portPos.y)
        this.ctx.stroke()
      }
      this.ctx.setLineDash([])
    }*/

    this.ctx.restore()
  }

  drawGrid() {
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue("--bg-tertiary").trim()
    this.ctx.strokeStyle = gridColor || "#334155"
    this.ctx.lineWidth = 0.5

    const offsetX = -Math.floor(this.panOffset.x / this.zoomLevel / GRID_SIZE) * GRID_SIZE
    const offsetY = -Math.floor(this.panOffset.y / this.zoomLevel / GRID_SIZE) * GRID_SIZE

    // Draw vertical lines
    for (let x = offsetX; x < this.canvas.width / this.zoomLevel + offsetX; x += GRID_SIZE) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, offsetY - GRID_SIZE)
      this.ctx.lineTo(x, offsetY + this.canvas.height / this.zoomLevel)
      this.ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = offsetY; y < this.canvas.height / this.zoomLevel + offsetY; y += GRID_SIZE) {
      this.ctx.beginPath()
      this.ctx.moveTo(offsetX - GRID_SIZE, y)
      this.ctx.lineTo(offsetX + this.canvas.width / this.zoomLevel, y)
      this.ctx.stroke()
    }
  }

  drawEdges() {
    for (let edgeIndex = 0; edgeIndex < this.state.edges.length; edgeIndex++) {
      const edge = this.state.edges[edgeIndex]
      const fromNode = this.state.nodes.find((n) => n.id === edge.from.nodeId)
      const toNode = this.state.nodes.find((n) => n.id === edge.to.nodeId)

      if (fromNode && toNode) {
        const fromPos = this.getPortPosition(fromNode, true, edge.from.portIndex)
        const toPos = this.getPortPosition(toNode, false, edge.to.portIndex)

        if (fromPos && toPos) {
          const isSelected = this.state.selectedEdgeId === edge.id
          this.ctx.strokeStyle = isSelected ? "#fbbf24" : "#64748b"
          this.ctx.lineWidth = isSelected ? 3 : 2
          this.ctx.beginPath()
          this.ctx.moveTo(fromPos.x, fromPos.y)

          // Draw path through waypoints
          if (edge.waypoints && edge.waypoints.length > 0) {
            for (const waypoint of edge.waypoints) {
              this.ctx.lineTo(waypoint.x, waypoint.y)
            }
          }

          this.ctx.lineTo(toPos.x, toPos.y)
          this.ctx.stroke()

          // Draw waypoints as small circles
          if (edge.waypoints && edge.waypoints.length > 0) {
            for (let wpIndex = 0; wpIndex < edge.waypoints.length; wpIndex++) {
              const wp = edge.waypoints[wpIndex]
              const isWpSelected = isSelected && this.state.selectedWaypointIndex === wpIndex
              this.ctx.fillStyle = isWpSelected ? "#fbbf24" : "#64748b"
              this.ctx.beginPath()
              this.ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2)
              this.ctx.fill()
            }
          }
        }
      }
    }
  }

  drawNodes() {
    for (const node of this.state.nodes) {
      this.drawNode(node)
    }
  }

  drawNode(node) {
    const isSelected = node.id === this.state.selectedNodeId
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--node-bg").trim()
    const hoverColor = getComputedStyle(document.documentElement).getPropertyValue("--primary-hover").trim()
    const textColor = getComputedStyle(document.documentElement).getPropertyValue("--node-text").trim()

    const bgColor = isSelected ? hoverColor : primaryColor

    const typeConfig = this.nodeTypeManager.getType(node.type)
    const shapeColor = typeConfig?.shapeColor || bgColor || "#3b82f6"
    const shape = typeConfig?.shape || "rectangle"
    const customImage = typeConfig?.customImage

    this.ctx.lineWidth = isSelected ? 3 : 2
    this.ctx.strokeStyle = isSelected ? "#fff" : shapeColor

    if (customImage) {
      this.drawCustomImageNode(node, customImage, isSelected)
    } else {
      switch (shape) {
        case "circle":
          this.drawCircleNode(node, shapeColor, isSelected)
          break
        case "diamond":
          this.drawDiamondNode(node, shapeColor, isSelected)
          break
        case "parallelogram":
          this.drawParallelogramNode(node, shapeColor, isSelected)
          break
        case "rectangle":
        default:
          this.drawRectangleNode(node, shapeColor, isSelected)
      }
    }

    // Draw label
    this.ctx.fillStyle = textColor || "#ffffff"
    this.ctx.font = "bold 14px sans-serif"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"

    const words = node.label.split(" ")
    const lineHeight = 16
    const startY = node.position.y - ((words.length - 1) * lineHeight) / 2

    words.forEach((word, index) => {
      this.ctx.fillText(word, node.position.x, startY + index * lineHeight)
    })

    // Draw ports
    if (typeConfig) {
      const portColor = "#64748b"

      // Output ports
      for (let i = 0; i < typeConfig.outputs; i++) {
        const portPos = this.getPortPosition(node, true, i)
        if (portPos) {
          this.ctx.fillStyle = portColor
          this.ctx.beginPath()
          this.ctx.arc(portPos.x, portPos.y, PORT_RADIUS, 0, Math.PI * 2)
          this.ctx.fill()
        }
      }

      // Input ports
      for (let i = 0; i < typeConfig.inputs; i++) {
        const portPos = this.getPortPosition(node, false, i)
        if (portPos) {
          this.ctx.fillStyle = portColor
          this.ctx.beginPath()
          this.ctx.arc(portPos.x, portPos.y, PORT_RADIUS, 0, Math.PI * 2)
          this.ctx.fill()
        }
      }
    }
  }

  drawRectangleNode(node, color, isSelected) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(node.position.x - node.width / 2, node.position.y - node.height / 2, node.width, node.height)
    this.ctx.strokeRect(node.position.x - node.width / 2, node.position.y - node.height / 2, node.width, node.height)
  }

  drawCircleNode(node, color, isSelected) {
    this.ctx.fillStyle = color
    const radius = Math.max(node.width, node.height) / 4
    this.ctx.beginPath()
    this.ctx.arc(node.position.x, node.position.y, radius, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()
  }

  drawDiamondNode(node, color, isSelected) {
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.moveTo(node.position.x, node.position.y - node.height / 2)
    this.ctx.lineTo(node.position.x + node.width / 2, node.position.y)
    this.ctx.lineTo(node.position.x, node.position.y + node.height / 2)
    this.ctx.lineTo(node.position.x - node.width / 2, node.position.y)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  drawParallelogramNode(node, color, isSelected) {
    const skew = 15
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.moveTo(node.position.x - node.width / 2 + skew, node.position.y - node.height / 2)
    this.ctx.lineTo(node.position.x + node.width / 2 + skew, node.position.y - node.height / 2)
    this.ctx.lineTo(node.position.x + node.width / 2 - skew, node.position.y + node.height / 2)
    this.ctx.lineTo(node.position.x - node.width / 2 - skew, node.position.y + node.height / 2)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  drawCustomImageNode(node, imageData, isSelected) {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        this.ctx.drawImage(
          img,
          node.position.x - node.width / 2,
          node.position.y - node.height / 2,
          node.width,
          node.height,
        )
        if (isSelected) {
          this.ctx.strokeRect(
            node.position.x - node.width / 2,
            node.position.y - node.height / 2,
            node.width,
            node.height,
          )
        }
      }
      img.src = imageData
    } catch (e) {
      console.error("Failed to load custom image:", e)
      this.drawRectangleNode(node, "#999", isSelected)
    }
  }

  addNode(type, label = "") {
    const id = `node-${Date.now()}`
    const typeConfig = this.nodeTypeManager.getType(type)
    if (!typeConfig) return

    this.state.nodes.push({
      id,
      type,
      label,
      position: { x: this.canvas.width / 2, y: this.canvas.height / 2 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
    this.state.selectedNodeId = id
    this.render()
  }

  deleteNode(id) {
    this.state.nodes = this.state.nodes.filter((n) => n.id !== id)
    this.state.edges = this.state.edges.filter((e) => e.from.nodeId !== id && e.to.nodeId !== id)
    this.state.selectedNodeId = null
    this.render()
  }

  updateNodeLabel(id, label) {
    const node = this.state.nodes.find((n) => n.id === id)
    if (node) {
      node.label = label
      this.render()
    }
  }

  getSelectedNodeId() {
    return this.state.selectedNodeId
  }

  clear() {
    this.state = {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedWaypointIndex: null,
      isDraggingNode: false,
      dragStart: null,
      isDrawingEdge: false,
      edgeStart: null,
      isPanningCanvas: false,
      panStart: null,
    }
    this.render()
  }

  loadDiagram(data) {
    this.state.nodes = data.nodes
    this.state.edges = data.edges
    this.render()
  }

  getDiagramState() {
    return {
      nodes: this.state.nodes,
      edges: this.state.edges,
    }
  }

  handleWheel(e) {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    const newZoom = Math.max(0.5, Math.min(3, this.zoomLevel + delta))
    const zoomChange = newZoom / this.zoomLevel

    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    this.panOffset.x = mouseX - (mouseX - this.panOffset.x) * zoomChange
    this.panOffset.y = mouseY - (mouseY - this.panOffset.y) * zoomChange

    this.zoomLevel = newZoom
    this.render()
  }

  handleKeyDown(e) {
    if ((e.key === "Delete" || e.key === "Backspace") && document.getElementById("nodeEditor").classList.contains("hidden")) {
      if (this.state.selectedWaypointIndex !== null && this.state.selectedEdgeId !== null) {
        // Delete waypoint
        const edge = this.state.edges.find((e) => e.id === this.state.selectedEdgeId)
        if (edge.waypoints && edge.waypoints.length > 0) {
          edge.waypoints.splice(this.state.selectedWaypointIndex, 1)
          this.state.selectedWaypointIndex = null
          this.render()
        }
      } else if (this.state.selectedEdgeId !== null) {
        // Delete edge
        this.state.edges = this.state.edges.filter((e) => e.id !== this.state.selectedEdgeId)
        this.state.selectedEdgeId = null
        this.render()
      } else if (this.state.selectedNodeId) {
        // Delete node
        const node = this.state.nodes.find((n) => n.id === this.state.selectedNodeId)
        if (node) {
          this.state.nodes = this.state.nodes.filter((n) => n.id !== this.state.selectedNodeId)
          this.state.edges = this.state.edges.filter(
            (edge) => edge.from.nodeId !== node.id && edge.to.nodeId !== node.id,
          )
          this.state.selectedNodeId = null
          this.render()
        }
      }
    }
  }

  getWaypointAtPosition(pos) {
    const threshold = 8 // pixels
    for (let edgeIndex = 0; edgeIndex < this.state.edges.length; edgeIndex++) {
      const edge = this.state.edges[edgeIndex]
      if (edge.waypoints && edge.waypoints.length > 0) {
        for (let wpIndex = 0; wpIndex < edge.waypoints.length; wpIndex++) {
          const wp = edge.waypoints[wpIndex]
          const dx = pos.x - wp.x
          const dy = pos.y - wp.y
          if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
            return { edgeIndex, waypointIndex: wpIndex }
          }
        }
      }
    }
    return null
  }

  getEdgeAtPosition(pos) {
    const threshold = 8 // pixels
    for (let edgeIndex = 0; edgeIndex < this.state.edges.length; edgeIndex++) {
      const edge = this.state.edges[edgeIndex]
      const fromNode = this.state.nodes.find((n) => n.id === edge.from.nodeId)
      const toNode = this.state.nodes.find((n) => n.id === edge.to.nodeId)

      if (!fromNode || !toNode) continue

      const fromPos = this.getPortPosition(fromNode, true, edge.from.portIndex)
      const toPos = this.getPortPosition(toNode, false, edge.to.portIndex)

      if (!fromPos || !toPos) continue

      const segments = []
      let lastPos = fromPos

      if (edge.waypoints && edge.waypoints.length > 0) {
        for (const wp of edge.waypoints) {
          segments.push({ start: lastPos, end: wp })
          lastPos = wp
        }
      }
      segments.push({ start: lastPos, end: toPos })

      for (const segment of segments) {
        if (this.isPointNearLine(pos, segment.start, segment.end, threshold)) {
          return edgeIndex
        }
      }
    }
    return null
  }

  isPointNearLine(point, lineStart, lineEnd, threshold) {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y
    const t = Math.max(
      0,
      Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)),
    )
    const closestX = lineStart.x + t * dx
    const closestY = lineStart.y + t * dy
    const distX = point.x - closestX
    const distY = point.y - closestY
    return Math.sqrt(distX * distX + distY * distY) <= threshold
  }

  handleContextMenu(e) {
    e.preventDefault()
    const mousePos = this.getMousePos(e)

    // If an edge is selected, add a waypoint at the clicked position
    if (this.state.selectedEdgeId !== null) {
      const edge = this.state.edges.find((e) => e.id === this.state.selectedEdgeId)
      if (edge) {
        if (!edge.waypoints) {
          edge.waypoints = []
        }
        edge.waypoints.push({ x: mousePos.x, y: mousePos.y })
        this.render()
      }
    }
  }

  handleDoubleClick(e) {
    const mousePos = this.getMousePos(e)
    const node = this.getNodeAtPosition(mousePos)
    if (node) {
      document.dispatchEvent(new CustomEvent("editNodeLabel", { detail: { nodeId: node.id } }))
    }
  }
}

// ============ UI Management ============
class DiagramUI {
  constructor(canvas, nodeTypeManager, themeManager) {
    this.canvas = canvas
    this.nodeTypeManager = nodeTypeManager
    this.themeManager = themeManager
    this.currentDiagramId = null
    this.pendingNodeImage = null
    this.setupEventListeners()
    this.updateMetadataDisplay()
    this.renderNodePalette()
    this.renderCustomTypesList()
  }

  setupEventListeners() {
    const sidebarToggle = document.getElementById("sidebarToggle")
    const sidebar = document.querySelector(".sidebar")
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed")
        sidebarToggle.textContent = sidebar.classList.contains("collapsed") ? "☰" : "✕"
      })
    }

    document.getElementById("themeToggle").addEventListener("click", () => {
      this.themeManager.toggle()
      this.canvas.render()
    })

    document.getElementById("addCustomTypeBtn").addEventListener("click", () => this.addCustomNodeType())
    document.getElementById("customNodeName").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addCustomNodeType()
    })

    // Main buttons
    document.getElementById("saveBtn").addEventListener("click", () => this.showSaveDialog())
    document.getElementById("loadBtn").addEventListener("click", () => this.showLoadDialog())
    document.getElementById("exportBtn").addEventListener("click", () => this.exportDiagram())
    document.getElementById("importBtn").addEventListener("click", () => this.triggerImport())
    document.getElementById("clearBtn").addEventListener("click", () => this.clearCanvas())
    document.getElementById("undoBtn").addEventListener("click", () => alert("Undo functionality coming soon!"))

    // Node editor
    document.getElementById("closeEditorBtn").addEventListener("click", () => this.closeNodeEditor())
    document.getElementById("deleteNodeBtn").addEventListener("click", () => this.deleteSelectedNode())

    // Keyboard listener for Delete key and label editing
    document.addEventListener("keydown", (e) => this.handleKeyDown(e))
    document.addEventListener("editNodeLabel", (e) => this.editNodeLabel(e.detail.nodeId))

    // Listener for label input changes
    document.getElementById("nodeLabel").addEventListener("change", (e) => {
      const id = this.canvas.getSelectedNodeId()
      if (id) {
        this.canvas.updateNodeLabel(id, e.target.value)
        this.closeNodeEditor()
      }
    })

    // File input
    document.getElementById("fileInput").addEventListener("change", (e) => this.handleFileImport(e))

    // Save dialog
    document.getElementById("confirmSaveBtn").addEventListener("click", () => this.confirmSave())
    document.getElementById("cancelSaveBtn").addEventListener("click", () => this.closeSaveDialog())

    // Load dialog
    document.getElementById("cancelLoadBtn").addEventListener("click", () => this.closeLoadDialog())

    // Metadata inputs
    document.getElementById("authorInput").addEventListener("change", () => this.updateMetadataDisplay())
    document.getElementById("diagramName").addEventListener("change", () => this.updateMetadataDisplay())

    document.getElementById("customNodeShape").addEventListener("change", (e) => {
      const shape = e.target.value
      document.getElementById("customNodeColor").style.display = shape === "rectangle" ? "block" : "none"
    })

    document.getElementById("customNodeImage").addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          console.log("[v0] Image uploaded, will be used for next node type created")
          this.pendingNodeImage = event.target.result
        }
        reader.readAsDataURL(file)
      }
    })
  }

  renderNodePalette() {
    const palette = document.getElementById("nodePalette")
    palette.innerHTML = ""

    const allTypes = this.nodeTypeManager.getAllTypes()

    for (const [typeKey, typeConfig] of Object.entries(allTypes)) {
      const isCustom = !(typeKey in this.nodeTypeManager.defaultTypes)

      const btn = document.createElement("button")
      btn.className = "node-btn"
      btn.innerHTML = `
        <span class="node-icon">📦</span>
        <span>${typeConfig.label}</span>
        ${isCustom ? `<span style="font-size: 0.6em; margin-left: auto;">(${typeConfig.inputs}in/${typeConfig.outputs}out)</span>` : ""}
      `
      btn.addEventListener("click", () => this.canvas.addNode(typeKey, `New ${typeConfig.label}`))

      palette.appendChild(btn)
    }
  }

  renderCustomTypesList() {
    const list = document.getElementById("customTypesList")
    list.innerHTML = ""

    const customTypes = Object.entries(this.nodeTypeManager.customTypes)

    if (customTypes.length === 0) {
      list.innerHTML =
        '<p style="font-size: 0.75rem; color: var(--text-secondary); text-align: center;">No custom types yet</p>'
    } else {
      customTypes.forEach(([key, config]) => {
        const item = document.createElement("div")
        item.className = "custom-type-item"
        item.innerHTML = `
          <span>${config.label} (${config.inputs}in/${config.outputs}out)</span>
          <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;">Remove</button>
        `
        item.querySelector("button").addEventListener("click", () => {
          this.nodeTypeManager.removeCustomType(key)
          this.renderNodePalette()
          this.renderCustomTypesList()
        })
        list.appendChild(item)
      })
    }
  }

  addCustomNodeType() {
    const name = document.getElementById("customNodeName").value.trim()
    const inputs = Number.parseInt(document.getElementById("customNodeInputs").value) || 0
    const outputs = Number.parseInt(document.getElementById("customNodeOutputs").value) || 0
    const shape = document.getElementById("customNodeShape").value
    const color = document.getElementById("customNodeColor").value

    if (!name) {
      alert("Please enter a type name")
      return
    }

    if (this.nodeTypeManager.addCustomType(name, inputs, outputs, shape, color)) {
      if (this.pendingNodeImage) {
        this.nodeTypeManager.setNodeTypeImage(name, this.pendingNodeImage)
        this.pendingNodeImage = null
        document.getElementById("customNodeImage").value = ""
      }
      document.getElementById("customNodeName").value = ""
      document.getElementById("customNodeInputs").value = "1"
      document.getElementById("customNodeOutputs").value = "1"
      document.getElementById("customNodeShape").value = "rectangle"
      document.getElementById("customNodeColor").value = "#8b5cf6"
      this.renderNodePalette()
      this.renderCustomTypesList()
    } else {
      alert("Could not add type. It may already exist.")
    }
  }

  showSaveDialog() {
    const dialog = document.getElementById("saveDialog")
    const input = document.getElementById("saveName")
    input.value = document.getElementById("diagramName").value || ""
    dialog.classList.remove("hidden")
  }

  closeSaveDialog() {
    document.getElementById("saveDialog").classList.add("hidden")
  }

  confirmSave() {
    const name = document.getElementById("saveName").value || "Untitled Diagram"
    const author = document.getElementById("authorInput").value || "Student"
    const { nodes, edges } = this.canvas.getDiagramState()

    const now = Date.now()
    const id = this.currentDiagramId || `diagram-${now}`
    const existing = DiagramStorage.getDiagram(id)

    const diagramData = {
      id,
      name,
      author,
      nodes,
      edges,
      createdAt: existing ? existing.createdAt : now,
      modifiedAt: now,
    }

    DiagramStorage.saveDiagram(diagramData)
    this.currentDiagramId = id
    document.getElementById("diagramName").value = name

    this.updateMetadataDisplay()
    this.closeSaveDialog()
    alert("Diagram saved successfully!")
  }

  showLoadDialog() {
    const dialog = document.getElementById("loadDialog")
    const list = document.getElementById("diagramsList")

    list.innerHTML = ""
    const diagrams = DiagramStorage.getAllDiagrams()

    if (diagrams.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No saved diagrams</p>'
    } else {
      diagrams.forEach((meta) => {
        const item = document.createElement("div")
        item.className = "diagram-item"
        item.innerHTML = `
          <div class="diagram-item-name">${meta.name}</div>
          <div class="diagram-item-meta">By ${meta.author} • Modified ${new Date(meta.modifiedAt).toLocaleDateString()}</div>
        `
        item.addEventListener("click", () => this.loadDiagram(meta.id))
        list.appendChild(item)
      })
    }

    dialog.classList.remove("hidden")
  }

  closeLoadDialog() {
    document.getElementById("loadDialog").classList.add("hidden")
  }

  loadDiagram(id) {
    const diagram = DiagramStorage.getDiagram(id)
    if (diagram) {
      this.canvas.loadDiagram(diagram)
      this.currentDiagramId = diagram.id
      document.getElementById("diagramName").value = diagram.name
      document.getElementById("authorInput").value = diagram.author
      this.updateMetadataDisplay()
      this.closeLoadDialog()
    }
  }

  exportDiagram() {
    const { nodes, edges } = this.canvas.getDiagramState()
    const name = document.getElementById("diagramName").value || "diagram"
    const author = document.getElementById("authorInput").value || "Student"

    const diagramData = {
      id: `export-${Date.now()}`,
      name,
      author,
      nodes,
      edges,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    }

    const json = DiagramStorage.exportDiagram(diagramData)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  triggerImport() {
    document.getElementById("fileInput").click()
  }

  handleFileImport(e) {
    const file = e.target.files?.[0]

    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = event.target.result
          const diagram = DiagramStorage.importDiagram(json)
          this.canvas.loadDiagram(diagram)
          this.currentDiagramId = null
          document.getElementById("diagramName").value = diagram.name
          document.getElementById("authorInput").value = diagram.author
          this.updateMetadataDisplay()
          alert("Diagram imported successfully!")
        } catch (error) {
          alert("Failed to import diagram: " + error.message)
        }
      }
      reader.readAsText(file)
      e.target.value = ""
    }
  }

  clearCanvas() {
    if (confirm("Are you sure you want to clear the canvas?")) {
      this.canvas.clear()
      this.currentDiagramId = null
      document.getElementById("diagramName").value = ""
      this.updateMetadataDisplay()
    }
  }

  deleteSelectedNode() {
    const id = this.canvas.getSelectedNodeId()
    if (id) {
      this.canvas.deleteNode(id)
      this.closeNodeEditor()
    }
  }

  // Keyboard handler for Delete key
  handleKeyDown(e) {
    if ((e.key === "Delete" || e.key === "Backspace") && document.getElementById("nodeEditor").classList.contains("hidden")) {
      const selectedId = this.canvas.getSelectedNodeId()
      if (selectedId) {
        e.preventDefault()
        this.canvas.deleteNode(selectedId)
        this.closeNodeEditor()
      }
    }
  }

  // Method to edit node label
  editNodeLabel(nodeId) {
    const node = this.canvas.state.nodes.find((n) => n.id === nodeId)
    if (!node) return

    const editor = document.getElementById("nodeEditor")
    const labelInput = document.getElementById("nodeLabel")
    labelInput.value = node.label

    // Position editor near the node (approximate screen position)
    const canvasRect = this.canvas.canvas.getBoundingClientRect()
    const screenX = canvasRect.left + (node.position.x + this.canvas.panOffset.x) * this.canvas.zoomLevel
    const screenY = canvasRect.top + (node.position.y + this.canvas.panOffset.y) * this.canvas.zoomLevel

    editor.style.left = Math.max(10, screenX - 125) + "px"
    editor.style.top = Math.max(10, screenY - 100) + "px"
    editor.classList.remove("hidden")
    labelInput.focus()
    labelInput.select()
  }

  closeNodeEditor() {
    document.getElementById("nodeEditor").classList.add("hidden")
  }

  updateMetadataDisplay() {
    const now = new Date()
    document.getElementById("createdTime").textContent = "Now"
    document.getElementById("modifiedTime").textContent = now.toLocaleString()
  }

  openNodeEditor(nodeId) {
    const node = this.canvas.state.nodes.find((n) => n.id === nodeId)
    if (node) {
      document.getElementById("nodeEditor").classList.remove("hidden")
      document.getElementById("nodeLabelInput").value = node.label
      document.getElementById("nodeLabelInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.updateNodeLabel(nodeId)
      })
    }
  }

  updateNodeLabel(nodeId) {
    const label = document.getElementById("nodeLabelInput").value.trim()
    this.canvas.updateNodeLabel(nodeId, label)
    this.closeNodeEditor()
  }
}

// ============ Application Initialization ============
document.addEventListener("DOMContentLoaded", () => {
  const canvasElement = document.getElementById("diagramCanvas");

  if (canvasElement) {
    const themeManager = new ThemeManager();
    const nodeTypeManager = new NodeTypeManager(canvasElement);
    const diagramCanvas = new DiagramCanvas(canvasElement, nodeTypeManager);
    const diagramUI = new DiagramUI(diagramCanvas, nodeTypeManager, themeManager);

    const authorInput = document.getElementById("authorInput")
    if (!authorInput.value) {
      authorInput.value = "Student";
    }

    // Update theme button icon on load
    themeManager.updateThemeButtonIcon();
    diagramCanvas.render();
  }
})

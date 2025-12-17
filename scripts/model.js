function generateID(){
    return crypto.randomUUID().substring(0,8)
}

class DiagramNode{
    constructor(nodeType, x, y){
        this.id = "node-"+generateID()
        this.nodeType = nodeType
        this.x = x
        this.y = y
    }

}

class DiagramEdge{
    constructor(outputNode, outputPortNumber, inputNode, inputPortNumber){
        this.id = "edge-"+generateID()
        this.joints = []
        this.outputNode = outputNode
        this.outputPortNumber = outputPortNumber
        this.inputNode = inputNode
        this.inputPortNumber = inputPortNumber
    }
}

class DiagramModel{
    constructor(){
        this.id = "diagram-"+generateID()
        this.nodes = []
        this.edges = []
        this.author = "Student"
        this.title = "Untitled Diagram"
        this.created = new Date()
        this.modified = new Date()
    }

    addNode(node){
        this.nodes.push(node)
    }

    addEdge(edge){
        this.edges.push(edge)
    }

    getNodeByID(nodeID){
        return this.nodes.filter((n) => n.id === nodeID)
    }

    getEdgeByID(edgeID){
        return this.nodes.filter((e) => e.id === edgeID)
    }

    deleteNode(nodeID){
        return this.nodes.splice(this.getNodeByID(nodeID),1)
    }

    deleteEdge(edgeID){
        return this.edges.splice(this.getEdgeByID(edgeID),1)
    }
}
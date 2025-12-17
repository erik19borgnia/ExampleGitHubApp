class DiagramNode{
    constructor(nodeType, x, y){
        this.id = "node-"+Date.now()
        this.nodeType = nodeType
        this.x = x
        this.y = y
    }

}

class DiagramEdge{
    constructor(outputNode, outputPortNumber, inputNode, inputPortNumber){
        this.id = "edge-"+Date.now()
        this.joints = []
        this.outputNode = outputNode
        this.outputPortNumber = outputPortNumber
        this.inputNode = inputNode
        this.inputPortNumber = inputPortNumber
    }
}

class DiagramModel{
    constructor(){
        this.id = "diagram-"+Date.now()
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

    addEdge(outputNode, outputPortNumber, inputNode, inputPortNumber){
        
    }



}
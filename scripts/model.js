class DiagramNode{
    constructor(){
        this.id = "node-"+Date.now()
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
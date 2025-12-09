const undoStack = []
const redoStack = []
//No more than 100 undoable actions
const maxUndoSize = 100
//Redo stack doesn't need a limit, it's bounded by undoStack

class Command{

    static undo(){
        if (undoStack.length === 0)
            throw new Error("No actions to undo")
        const com = undoStack.pop()
        com.reverseAction()
        redoStack.push(com)
        const redoButton = document.getElementById("redoBtn")
        if (redoButton)
            redoButton.classList.add("enabled")
        if (undoStack.length === 0){
            const undoButton = document.getElementById("undoBtn")
            if (undoButton)
                undoButton.classList.remove("enabled")
        }
    }
    static redo(){
        if (redoStack.length === 0)
            throw new Error("No actions to redo")
        const com = redoStack.pop()
        com.action()
        undoStack.push(com)
        const undoButton = document.getElementById("undoBtn")
        if (undoButton)
            undoButton.classList.add("enabled")
        if (redoStack.length === 0){
            const redoButton = document.getElementById("redoBtn")
            if (redoButton)
                redoButton.classList.remove("enabled")
        }
    }
    static clearStacks(){
        undoStack.length = 0
        redoStack.length = 0
        const redoButton = document.getElementById("redoBtn")
        if (redoButton)
            redoButton.classList.remove("enabled")
        const undoButton = document.getElementById("undoBtn")
        if (undoButton)
            undoButton.classList.remove("enabled")
    }

    execute(){
        this.action()
        //Save into undo stack
        //If there are more actions than the limit, remove the oldest
        if (undoStack.length === maxUndoSize)
            undoStack.shift()
        undoStack.push(this)
        //New action clears redo stack
        redoStack.length = 0
        const undoButton = document.getElementById("undoBtn")
        if (undoButton)
            undoButton.classList.add("enabled")
    }
    action(){
        throw new Error("Action must be defined by child class")
    }
    reverseAction(){
        throw new Error("Reverse action must be defined by child class")
    }
}
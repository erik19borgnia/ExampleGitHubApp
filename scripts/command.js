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
            redoButton.disabled = false
        if (undoStack.length === 0){
            const undoButton = document.getElementById("undoBtn")
            if (undoButton)
                undoButton.disabled = true
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
            undoButton.disabled = false
        if (redoStack.length === 0){
            const redoButton = document.getElementById("redoBtn")
            if (redoButton)
                redoButton.disabled = true
        }
    }
    static clearStacks(){
        undoStack.length = 0
        redoStack.length = 0
        const redoButton = document.getElementById("redoBtn")
        if (redoButton)
            redoButton.disabled = true
        const undoButton = document.getElementById("undoBtn")
        if (undoButton)
            undoButton.disabled = true
    }

    execute(){
        this.action()
        //Save into undo stack
        //If there are more actions than the limit, remove the oldest
        if (undoStack.length === maxUndoSize)
            undoStack.shift()
        undoStack.push(this)
        const undoButton = document.getElementById("undoBtn")
        if (undoButton)
            undoButton.disabled = false
        //New action clears redo stack
        redoStack.length = 0
        const redoButton = document.getElementById("redoBtn")
        if (redoButton)
            redoButton.disabled = true
    }
    action(){
        throw new Error("Action must be defined by child class")
    }
    reverseAction(){
        throw new Error("Reverse action must be defined by child class")
    }
}

//Clear stacks, disable buttons
Command.clearStacks()
//Add events for Ctrl commands
document.addEventListener('keydown', function(event) {
    try{
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault(); 
            Command.undo();
        }
        if (event.ctrlKey && event.key === 'y') {
            event.preventDefault(); 
            Command.redo();
        }
    }catch(error){
        console.log(error)
    }
});
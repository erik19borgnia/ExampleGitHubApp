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
var undoing = null
var redoing = null
document.addEventListener('keydown', function(event) {
    try{
        if (event.ctrlKey && event.key === 'z') {
            if (!undoing){
                event.preventDefault()
                Command.undo()
                undoing = setInterval(()=>{Command.undo()},200)
            }
        }
        else if (event.ctrlKey && event.key === 'y') {
            if (!redoing){
                event.preventDefault()
                Command.redo()
                redoing = setInterval(()=>{Command.redo()},200)
            }
        }
    }catch(error){
        console.log(error)
    }
});
document.addEventListener('keyup', function(event) {
    if (undoing && (!event.ctrlKey || event.key === 'z'))
    {
        clearInterval(undoing)
        undoing = null
    }
    if (redoing && (!event.ctrlKey || event.key === 'y'))
    {
        clearInterval(redoing)
        redoing = null
    }
});
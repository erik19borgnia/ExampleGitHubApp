# Flux Diagram Editor

A static, browser-based flux diagram editor that runs entirely on GitHub Pages. Create, edit, save, and export flow diagrams with ease.

## Features

- **Node Creation**: Add process, decision, and start/end nodes
- **Visual Editing**: Drag and drop nodes on canvas
- **Save/Load**: Store diagrams locally in browser storage
- **Export/Import**: Download and upload diagrams as JSON
- **Metadata**: Track author, creation time, and modification time

## Getting Started

### GitHub Pages Deployment

1. Clone to your GitHub repository
2. Enable GitHub Pages in repository settings
3. Select main branch as source
4. Your site will be available at `https://username.github.io/repository-name`

## Scripts architecture

- **themeManager.js**: Class for the day/night theme management
- **storageManager.js**: Class for the storage save/load and import/export functionality
- **nodeTypeManager.js**: Class that contains all nodes, default ones and custom ones
- **canvas.js**: Canvas rendering, node interactions and app initialization

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT

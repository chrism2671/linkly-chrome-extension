# CLAUDE.md for Linkly Chrome Extension

## Development Commands
- **Build Extension**: zip -r package.zip manifest.json background.js icon16.png icon48.png icon128.png waves-large.png waves-pink.png
- **Install Locally**: Load unpacked extension via chrome://extensions (developer mode)
- **Test**: Manual testing in Chrome - click the extension button to create links
- **Firefox Build**: Update manifest.json per Firefox requirements before packaging

## Code Style Guidelines
- **JS Formatting**: Use 2-space indentation, semicolons, single quotes
- **Naming**: camelCase for variables/functions, descriptive names
- **Extension Best Practices**:
  - Keep background scripts minimal and non-persistent
  - Use event listeners for browser actions
  - Follow Chrome extension security best practices
  - Request only necessary permissions
- **Error Handling**: Implement try/catch blocks for network operations
- **Comments**: Document non-obvious functionality and permission usage

## Architecture Notes
This simple extension opens the Linkly web app with current tab URL when clicked.
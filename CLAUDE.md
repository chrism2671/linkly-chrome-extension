# CLAUDE.md for Linkly Chrome Extension

## Development Commands
- **Build Extension**: zip -r package.zip manifest.json background.js icon16.png icon48.png icon128.png waves-large.png waves-pink.png
- **Release**: `node scripts/release.mjs` builds the Chrome + Firefox zips (Firefox gets its own manifest), asks for confirmation, then uploads and submits both for review. Needs credentials in `.env` (copy `.env.example`); Chrome auth prefers a service account via gcloud impersonation (`CWS_SERVICE_ACCOUNT`). `--dry-run` builds only; `--chrome-only` / `--firefox-only`; `--no-publish` leaves Chrome as a draft. Bump `version` in manifest.json and commit first. Safari is still a manual Xcode release. `node scripts/cws-auth.mjs` is the one-time helper that fetches the Chrome refresh token into `.env` after `CWS_CLIENT_ID`/`CWS_CLIENT_SECRET` are set.
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
This simple extension opens the Linkly web app with the URL to shorten. Two entry points, both going through `openLinkCreator()` in `background.js` (which URL-encodes the value):
- Toolbar button: the current tab URL (`activeTab` permission).
- Right-click menu "Shorten with Linkly" on links and on highlighted text (`contextMenus` permission): the clicked link's URL, or a URL extracted from the selection by `urlFromSelection()` for plain-text URLs. The menu is registered in `runtime.onInstalled`.
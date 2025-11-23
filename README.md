# Linkly Browser Extension

**Create trackable short links instantly from any webpage.** The official Linkly browser extension for Chrome, Firefox, and Safari makes link tracking and URL shortening effortless.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Install-blue?style=for-the-badge&logo=google-chrome)](https://chrome.google.com/webstore/detail/linkly-for-google-chrome/eafdoeojplandfjbmjkglljhlckoajcg)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Install-orange?style=for-the-badge&logo=firefox)](https://addons.mozilla.org/firefox/)
[![Mac App Store](https://img.shields.io/badge/Safari-Install-black?style=for-the-badge&logo=safari)](https://apps.apple.com/)

---

## Features

- **One-Click Link Creation** - Turn any webpage into a trackable Linkly link instantly
- **Click Tracking & Analytics** - Monitor link performance with detailed analytics
- **Custom URL Shortening** - Create branded short links on the fly
- **Cross-Browser Support** - Available for Chrome, Firefox, and Safari
- **Privacy-Focused** - Only accesses the current tab URL when you click the button
- **Lightweight & Fast** - Minimal permissions, maximum performance

## Installation

### Chrome

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/linkly-for-google-chrome/eafdoeojplandfjbmjkglljhlckoajcg)
2. Click **Add to Chrome**
3. Sign in to your [Linkly account](https://linklyhq.com)
4. Click the Linkly icon to start creating tracked links

### Firefox

1. Visit [Firefox Add-ons](https://addons.mozilla.org/firefox/)
2. Click **Add to Firefox**
3. Sign in to your [Linkly account](https://linklyhq.com)
4. Click the Linkly icon to start creating tracked links

### Safari

1. Download from the [Mac App Store](https://apps.apple.com/)
2. Open the Linkly app from Applications
3. Enable the extension in **Safari → Settings → Extensions**
4. Sign in to your [Linkly account](https://linklyhq.com)
5. Click the Linkly icon to start creating tracked links

## How to Use

1. **Navigate** to any webpage you want to track
2. **Click** the Linkly extension icon in your browser toolbar
3. **Create** your trackable link with custom settings
4. **Share** and monitor performance via your Linkly dashboard

## Permissions & Privacy

The Linkly extension requests minimal permissions:

- **Active Tab** - Only accesses the current tab's URL when you click the button
- **No Background Tracking** - The extension does not track your browsing history
- **No Data Collection** - We only process the URL you choose to shorten

Your privacy is our priority. Read our full [Privacy Policy](https://linklyhq.com/privacy).

## Development

### Build for Chrome/Firefox

```bash
zip -r package.zip manifest.json background.js icon16.png icon48.png icon128.png waves-large.png waves-pink.png
```

### Build for Safari

1. Open `Linkly/Linkly.xcodeproj` in Xcode
2. Select the **Linkly (macOS)** scheme
3. Build and run (⌘R)

### Tech Stack

- **Manifest V3** - Modern extension architecture
- **JavaScript** - Vanilla JS, no dependencies
- **Safari Extension Converter** - Native Safari support

## Contributing

We welcome contributions! This is an open-source project.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Related Projects

- [Linkly for Google Sheets](https://gsuite.google.com/marketplace/app/linkly_for_google_sheets/877597528733?pann=cwsdp&hl=en-GB) - Bulk link shortening in spreadsheets
- [Linkly Platform](https://linklyhq.com) - Full-featured link management platform

## Support

- **Website**: [linklyhq.com](https://linklyhq.com)
- **Issues**: [GitHub Issues](https://github.com/chrism2671/linkly-chrome-extension/issues)
- **Documentation**: [Help Center](https://linklyhq.com/help)

## License

See the extension store listings for license information.

---

**Keywords**: link tracking, URL shortener, click tracking, link analytics, custom short links, branded links, browser extension, link management, marketing tools, UTM tracking

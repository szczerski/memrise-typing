# Memrise Typing

**Learn by typing, not clicking.** This userscript replaces Memrise's multiple choice questions with a text input, forcing you to recall and type the answer from memory.

Works with the **new Memrise UI** (2024/2025+). The old "Memrise All Typing" userscript by cooljingle no longer works because Memrise completely rebuilt their frontend.

![Memrise Typing in action](screenshots/typing-mode.png)

## Features

- **Multiple choice replaced with typing** - Instead of picking from 4 buttons, you type the answer yourself
- **Smart diacritics matching** - No special keyboard needed. Type a simplified version and it matches the accented original. Works for French, German, Polish, Norwegian, and more:

  | You type | Matches |
  |----------|---------|
  | `ca va` | `ça va` |
  | `cafe` | `café` |
  | `etre` | `être` |
  | `coeur` | `cœur` |
  | `uber` | `über` |
  | `strasse` | `Straße` |
  | `hoflig` | `høflig` |
  | `lodz` | `łódź` |
  | `byc` | `być` |

- **Apostrophe & punctuation tolerance** - Curly apostrophes (`'`), typographic dashes (`–`, `—`), and French non-breaking spaces (` `) are all treated as their plain equivalents — so `c'est` matches `c'est` regardless of which apostrophe Memrise stored. Trailing punctuation like `?` or `!` is never required.

- **CJK auto-detection** - Chinese, Japanese, and Korean questions stay as multiple choice (typing without IME makes no sense)
- **Toggle back to buttons** - Press **Tab** or click "Show buttons" to switch back to multiple choice for any question
- **Reveal answers** - Press **Shift+Enter** to peek at the available answers

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Check your answer |
| `Shift+Enter` | Reveal all possible answers |
| `Tab` | Switch to multiple choice buttons |

## Installation

1. Install a userscript manager for your browser:
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended) - Chrome, Firefox, Edge, Safari, Opera
   - [Violentmonkey](https://violentmonkey.github.io/) - Chrome, Firefox, Edge
   - [Greasemonkey](https://www.greasespot.net/) - Firefox

2. Click the link below to install the script:

   **[Install Memrise Typing](Memrise_Typing.user.js)** (click "Raw" if viewing on GitHub)

   Or manually:
   - Click the Tampermonkey icon in your browser toolbar
   - Select "Create a new script"
   - Delete the default template
   - Paste the contents of `Memrise_Typing.user.js`
   - Press `Ctrl+S` to save

3. Go to [memrise.com](https://www.memrise.com) and start a learning session. Multiple choice questions will automatically be replaced with a typing input.

## Configuration

At the top of the script you'll find a `CONFIG` object:

```javascript
const CONFIG = {
  replaceMultipleChoice: true,  // set to false to disable entirely
  skipCJK: true,                // keep MC for Chinese/Japanese/Korean
  debug: false,                 // enable console logging
};
```

## Known Limitations

- **Desktop only** - Userscripts don't work on mobile apps
- **Memrise updates may break it** - If Memrise changes their `data-testid` attributes or DOM structure, the script may need updating. Open an issue if this happens.
- **Community courses** - Supported at `community-courses.memrise.com`, but uses a different DOM structure so edge cases may appear — open an issue if something doesn't work.

## Contributing

Found a bug or have a suggestion? Open an issue or submit a pull request.

## License

MIT

# Contributing to haiku-index

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help makes haiku-index better for everyone.

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/mjc02840/haiku-index.git
cd haiku-index
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Installation

```bash
node src/cli.js --help
```

## Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive names:
- `feature/add-filtering` - New feature
- `fix/search-bug` - Bug fix
- `docs/update-readme` - Documentation
- `perf/optimize-search` - Performance improvement

### Making Changes

1. Make your changes to relevant files
2. Test your changes locally:
   ```bash
   node src/cli.js search "test"
   node src/ingest-all-q-series.js
   ```
3. Verify no other features broke

### Code Style

We prefer simple, readable code:
- Node.js 14+ syntax
- Standard JavaScript (no frameworks for core code)
- Comments for complex logic
- Clear variable names

Example:
```javascript
// Good: Clear variable name
const hasKeyword = content.includes('deployment');

// Avoid: Cryptic abbreviations
const hkwd = content.includes('deployment');
```

### Committing Changes

Write clear commit messages:

```bash
git commit -m "Add feature: search filtering by date range"
```

Avoid:
```bash
git commit -m "fixes" # Too vague
git commit -m "asdfghjkl" # Not helpful
```

### Pushing to Your Fork

```bash
git push origin feature/your-feature-name
```

### Creating a Pull Request

1. Go to GitHub
2. Click "Compare & pull request"
3. Fill in the PR template:
   - **Title:** Brief description (50 chars max)
   - **Description:** What does this do? Why? Any testing?
   - **Related Issues:** Link to relevant issues

Example PR description:
```markdown
## Summary
Adds ability to filter search results by date range.

## Changes
- Added `--since` and `--until` flags to search command
- Updated CLI parser to handle date arguments
- Added validation for date format (YYYY-MM-DD)

## Testing
Tested with:
- `node src/cli.js search "Q10" --since 2026-02-01 --until 2026-02-15`
- Edge cases: future dates, invalid formats

## Checklist
- [x] Code works locally
- [x] No breaking changes
- [x] Updated relevant docs
```

## Reporting Issues

Found a bug? Have a suggestion? [Open an issue](https://github.com/mjc02840/haiku-index/issues).

### Bug Report Template

```markdown
## Description
Brief description of the bug.

## Steps to Reproduce
1. Run: `node src/cli.js search "Q10"`
2. Observe: [what happens]
3. Expected: [what should happen]

## Environment
- Node.js version: (run `node --version`)
- OS: Mac/Linux/Windows
- haiku-index version: (check package.json)

## Screenshots
[If applicable]
```

### Feature Request Template

```markdown
## Problem
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
Any other approaches?

## Example Usage
How would users interact with this?
```

## Code Review

All pull requests to [github.com/mjc02840/haiku-index](https://github.com/mjc02840/haiku-index) will be reviewed. Common feedback:
- Code clarity - Is it easy to understand?
- Performance - Will this slow things down?
- Breaking changes - Does it break existing functionality?
- Documentation - Does it need docs/comments?

Be open to feedback! Everyone benefits from fresh perspectives.

## Running Tests

Currently no automated tests. Before submitting a PR, manually test:

```bash
# Test search
node src/cli.js search "Q10"

# Test view
node src/cli.js view [some-conversation-id]

# Test list
node src/cli.js list-projects

# Test ingest (careful, this re-indexes)
node src/ingest-all-q-series.js
```

## Documentation

If adding a feature, update:
- `README.md` - Add to features or CLI commands
- `docs/FAQ.md` - Add common questions
- Inline code comments - Explain complex logic

## License

All contributions are MIT licensed (see [LICENSE](LICENSE)).

By contributing, you agree to license your work under MIT.

## Questions?

- Check existing issues and PRs
- Read the [architecture docs](docs/ARCHITECTURE.md)
- Review the [FAQ](docs/FAQ.md)
- Open an issue to discuss

## Thank You

Every contribution, no matter how small, helps make haiku-index better. Thank you for being part of this!

---

**Happy coding!** 🚀

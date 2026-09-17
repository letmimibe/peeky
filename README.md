# Peeky

**Drop a file. Have a peek.**

Peeky is a tiny local-first reader for HTML, Markdown, and plain text files.

## What it does

- Drag and drop `.html`, `.htm`, `.md`, `.markdown`, `.txt`, and `.text` files
- Paste Markdown, HTML, or text directly
- Render Markdown into a clean reading view
- Preview HTML in a sandboxed iframe
- Switch between Preview and Source
- Auto-generate a table of contents for Markdown headings
- Search inside the current document
- Copy source instantly
- Print or save the current view as PDF
- Light and dark themes
- Responsive layout for desktop and mobile
- Local-first: opened files are processed in the browser and are not uploaded by Peeky

## Deploy

Peeky is a static site. You can deploy it directly to Cloudflare Pages, GitHub Pages, Netlify, Vercel, or any static host.

For Cloudflare Pages, no build command is required. Use the repository root as the output directory.

## Stack

Vanilla HTML, CSS, and JavaScript, with `marked` loaded from jsDelivr for Markdown rendering.

## Privacy note

Peeky reads local files in your browser using the File API. HTML previews are rendered inside a sandboxed iframe. No backend is required for the core reader.

## License

MIT

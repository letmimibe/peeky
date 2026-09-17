const $ = (s) => document.querySelector(s);

const state = {
  source: '',
  type: 'text',
  name: 'untitled.txt',
};

const landing = $('#landing');
const reader = $('#reader');
const fileInput = $('#fileInput');
const dropzone = $('#dropzone');
const previewPane = $('#previewPane');
const sourcePane = $('#sourcePane');
const sourceCode = $('#sourceCode');
const previewTab = $('#previewTab');
const sourceTab = $('#sourceTab');
const tocWrap = $('#tocWrap');
const toc = $('#toc');
const fileName = $('#fileName');
const fileDetails = $('#fileDetails');
const fileIcon = $('#fileIcon');
const pastePanel = $('#pastePanel');
const pasteInput = $('#pasteInput');
const pasteType = $('#pasteType');
const searchBar = $('#searchBar');
const searchInput = $('#searchInput');
const searchCount = $('#searchCount');
const progressBar = $('#progressBar');

const typeLabels = {
  markdown: 'Markdown',
  html: 'HTML',
  text: 'Plain text',
};

function getTypeFromName(name = '') {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  return 'text';
}

function prettySize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  })[ch]);
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function setMode(mode) {
  const preview = mode === 'preview';
  previewPane.hidden = !preview;
  sourcePane.hidden = preview;
  previewTab.classList.toggle('active', preview);
  sourceTab.classList.toggle('active', !preview);
  previewTab.setAttribute('aria-selected', String(preview));
  sourceTab.setAttribute('aria-selected', String(!preview));
}

function buildToc() {
  toc.innerHTML = '';
  if (state.type !== 'markdown') {
    tocWrap.hidden = true;
    return;
  }

  const headings = [...previewPane.querySelectorAll('h1,h2,h3')];
  if (!headings.length) {
    tocWrap.hidden = true;
    return;
  }

  const seen = new Map();
  headings.forEach((heading) => {
    let id = slugify(heading.textContent) || 'section';
    const count = seen.get(id) || 0;
    seen.set(id, count + 1);
    if (count) id = `${id}-${count + 1}`;
    heading.id = id;

    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = heading.textContent;
    link.className = `level-${heading.tagName.slice(1)}`;
    toc.appendChild(link);
  });
  tocWrap.hidden = false;
}

function renderPreview() {
  previewPane.innerHTML = '';

  if (state.type === 'markdown') {
    if (!state.source.trim()) {
      previewPane.innerHTML = '<p class="empty-text">Nothing to preview.</p>';
    } else if (window.marked) {
      marked.setOptions({ gfm: true, breaks: false });
      previewPane.innerHTML = marked.parse(state.source);
    } else {
      previewPane.innerHTML = `<pre>${escapeHtml(state.source)}</pre>`;
    }
    buildToc();
    return;
  }

  tocWrap.hidden = true;

  if (state.type === 'html') {
    const frame = document.createElement('iframe');
    frame.className = 'html-frame';
    frame.setAttribute('sandbox', 'allow-forms allow-modals allow-popups allow-same-origin');
    frame.setAttribute('title', `Preview of ${state.name}`);
    frame.srcdoc = state.source;
    previewPane.appendChild(frame);
    return;
  }

  const article = document.createElement('article');
  article.innerHTML = state.source.trim()
    ? escapeHtml(state.source).replace(/\n/g, '<br>')
    : '<p class="empty-text">Nothing to preview.</p>';
  previewPane.appendChild(article);
}

function openContent(source, type, name, size = null) {
  state.source = source;
  state.type = type;
  state.name = name;

  fileName.textContent = name;
  fileDetails.textContent = [typeLabels[type], size ? prettySize(size) : null].filter(Boolean).join(' · ');
  fileIcon.textContent = type === 'markdown' ? 'MD' : type === 'html' ? 'HTML' : 'TXT';
  sourceCode.textContent = source;
  renderPreview();
  setMode('preview');

  landing.hidden = true;
  reader.hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
  updateProgress();
}

async function openFile(file) {
  const type = getTypeFromName(file.name);
  const source = await file.text();
  openContent(source, type, file.name, file.size);
}

function resetApp() {
  state.source = '';
  state.type = 'text';
  state.name = 'untitled.txt';
  fileInput.value = '';
  searchInput.value = '';
  searchBar.hidden = true;
  reader.hidden = true;
  landing.hidden = false;
  toc.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function clearHighlights(root) {
  root.querySelectorAll('mark[data-peeky-search]').forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent)));
}

function highlightText(root, query) {
  clearHighlights(root);
  if (!query) return 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest('script,style,textarea,iframe')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let count = 0;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  nodes.forEach((node) => {
    const text = node.nodeValue;
    if (!regex.test(text)) return;
    regex.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    text.replace(regex, (match, offset) => {
      frag.append(document.createTextNode(text.slice(last, offset)));
      const mark = document.createElement('mark');
      mark.dataset.peekySearch = '1';
      mark.textContent = match;
      frag.append(mark);
      last = offset + match.length;
      count += 1;
      return match;
    });
    frag.append(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  });
  return count;
}

function runSearch() {
  const query = searchInput.value.trim();
  const root = sourcePane.hidden ? previewPane : sourcePane;
  if (state.type === 'html' && sourcePane.hidden) {
    searchCount.textContent = 'Search source mode for HTML';
    return;
  }
  const count = highlightText(root, query);
  searchCount.textContent = `${count} ${count === 1 ? 'match' : 'matches'}`;
  root.querySelector('mark[data-peeky-search]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateProgress() {
  if (reader.hidden) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const value = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
  progressBar.style.width = `${value}%`;
}

fileInput.addEventListener('change', () => fileInput.files[0] && openFile(fileInput.files[0]));

dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragging');
  });
});
['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragging');
  });
});
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) openFile(file);
});

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

$('#pasteToggle').addEventListener('click', () => {
  pastePanel.hidden = !pastePanel.hidden;
  if (!pastePanel.hidden) pasteInput.focus();
});

$('#openPaste').addEventListener('click', () => {
  const type = pasteType.value;
  const extension = type === 'markdown' ? 'md' : type === 'html' ? 'html' : 'txt';
  openContent(pasteInput.value, type, `pasted.${extension}`);
});

$('#newFileBtn').addEventListener('click', resetApp);
previewTab.addEventListener('click', () => setMode('preview'));
sourceTab.addEventListener('click', () => setMode('source'));

$('#copyBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(state.source);
  const btn = $('#copyBtn');
  const old = btn.textContent;
  btn.textContent = '✓';
  setTimeout(() => (btn.textContent = old), 900);
});

$('#printBtn').addEventListener('click', () => window.print());

$('#searchBtn').addEventListener('click', () => {
  searchBar.hidden = !searchBar.hidden;
  if (!searchBar.hidden) searchInput.focus();
  else {
    clearHighlights(previewPane);
    clearHighlights(sourcePane);
    searchInput.value = '';
    searchCount.textContent = '0 matches';
  }
});

$('#closeSearch').addEventListener('click', () => {
  searchBar.hidden = true;
  clearHighlights(previewPane);
  clearHighlights(sourcePane);
  searchInput.value = '';
  searchCount.textContent = '0 matches';
});
searchInput.addEventListener('input', runSearch);

$('#themeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('peeky-theme', next);
  $('#themeBtn').textContent = next === 'dark' ? '☾' : '☼';
});

const savedTheme = localStorage.getItem('peeky-theme');
if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
  $('#themeBtn').textContent = savedTheme === 'dark' ? '☾' : '☼';
} else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
  document.documentElement.dataset.theme = 'dark';
  $('#themeBtn').textContent = '☾';
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);

document.addEventListener('keydown', (e) => {
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key.toLowerCase() === 'k' && !reader.hidden) {
    e.preventDefault();
    searchBar.hidden = false;
    searchInput.focus();
  }
  if (e.key === 'Escape' && !searchBar.hidden) $('#closeSearch').click();
});

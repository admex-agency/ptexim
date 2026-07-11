(() => {
  const TOTAL_CONTENT = 20;
  const PAGE_OFFSET = 1; // first internal page is the branded flyleaf
  const $ = id => document.getElementById(id);
  const viewport = $('viewport');
  const zoomStage = $('zoomStage');
  const bookEl = $('book');
  const pageLabel = $('pageLabel');
  const thumbPanel = $('thumbPanel');
  const scrim = $('scrim');
  const zoomValue = $('fitBtn');
  let zoom = 1;

  // Preserve the original portrait page ratio (2550 × 3578) and calculate
  // the largest full-page size that fits inside the current viewport.
  const PAGE_RATIO = 2550 / 3578;
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const availableWidth = Math.max(280, window.innerWidth - (mobile ? 16 : 144));
  const availableHeight = Math.max(393, window.innerHeight - (mobile ? 140 : 184));
  const maxPageWidth = Math.floor(Math.min(
    availableHeight * PAGE_RATIO,
    mobile ? availableWidth : availableWidth / 2
  ));
  const maxPageHeight = Math.floor(maxPageWidth / PAGE_RATIO);

  const pageFlip = new St.PageFlip(bookEl, {
    width: 714,
    height: 1000,
    size: 'stretch',
    minWidth: Math.min(280, maxPageWidth),
    maxWidth: maxPageWidth,
    minHeight: Math.min(393, maxPageHeight),
    maxHeight: maxPageHeight,
    maxShadowOpacity: 0.42,
    showCover: false,
    mobileScrollSupport: true,
    usePortrait: true,
    flippingTime: 1150,
    drawShadow: true,
    autoSize: true,
    clickEventForward: true,
    useMouseEvents: true,
    swipeDistance: 24,
    startZIndex: 0
  });

  pageFlip.loadFromHTML(document.querySelectorAll('.book-page'));

  function contentPageFromInternal(index) {
    if (index <= 0) return 1;
    if (index >= TOTAL_CONTENT + 1) return TOTAL_CONTENT;
    return index;
  }

  function setLabel(index) {
    const content = contentPageFromInternal(index);
    pageLabel.textContent = `Trang ${content} / ${TOTAL_CONTENT}`;
    document.querySelectorAll('.thumb').forEach((el, i) => el.classList.toggle('active', i + 1 === content));
    const atStart = index <= 0;
    const atEnd = index >= TOTAL_CONTENT + 1;
    [$('prevBtn'), $('dockPrevBtn')].forEach(b => b.disabled = atStart);
    [$('nextBtn'), $('dockNextBtn')].forEach(b => b.disabled = atEnd);
  }

  pageFlip.on('flip', e => setLabel(e.data));
  pageFlip.on('init', e => setLabel(e.data.page));
  pageFlip.on('changeOrientation', () => requestAnimationFrame(() => setZoom(1)));

  function prev() { pageFlip.flipPrev('top'); }
  function next() { pageFlip.flipNext('top'); }
  $('prevBtn').onclick = $('dockPrevBtn').onclick = prev;
  $('nextBtn').onclick = $('dockNextBtn').onclick = next;

  function setZoom(value) {
    zoom = Math.max(1, Math.min(2.25, value));
    zoomStage.style.transform = `scale(${zoom})`;
    zoomStage.classList.toggle('is-zoomed', zoom > 1.01);
    zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    viewport.classList.toggle('is-zoomed', zoom > 1.01);
  }
  $('zoomIn').onclick = () => setZoom(zoom + 0.2);
  $('zoomOut').onclick = () => setZoom(zoom - 0.2);
  $('fitBtn').onclick = () => setZoom(1);
  $('fullscreenBtn').onclick = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  function panelOpen(open) {
    thumbPanel.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
    thumbPanel.setAttribute('aria-hidden', String(!open));
  }
  $('thumbBtn').onclick = $('dockThumbBtn').onclick = () => panelOpen(true);
  $('closeThumb').onclick = () => panelOpen(false);
  scrim.onclick = () => panelOpen(false);

  const grid = $('thumbGrid');
  for (let n = 1; n <= TOTAL_CONTENT; n++) {
    const b = document.createElement('button');
    b.className = 'thumb';
    b.type = 'button';
    b.innerHTML = `<span class="thumb-image"><img src="assets/pages/P${n}.jpg" loading="lazy" decoding="async" alt="Trang ${n}"></span><span class="thumb-label">Trang ${n}</span>`;
    b.onclick = () => {
      pageFlip.turnToPage(n + PAGE_OFFSET);
      panelOpen(false);
    };
    grid.appendChild(b);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    if (e.key === 'Escape') panelOpen(false);
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom(zoom + .2); }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(zoom - .2); }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1); }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => setZoom(1), 160);
  });

  // Decode nearby images early, avoiding first-turn stalls on high-resolution pages.
  const warm = n => {
    const img = new Image();
    img.decoding = 'async';
    img.src = `assets/pages/P${n}.jpg`;
    img.decode?.().catch(() => {});
  };
  [1, 2, 3, 4, 5, 6].forEach(warm);
  setTimeout(() => { for (let n = 7; n <= TOTAL_CONTENT; n++) warm(n); }, 800);
})();

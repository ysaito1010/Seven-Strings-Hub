(function () {
  const PAGE_SHELL_SELECTOR = '#page-shell';
  const MAIN_CONTENT_SELECTOR = '#main-content';

  // 💡 通常遷移（PJAX除外）にするページ判定ヘルパー
  function isExcludedPath(pathname) {
    const path = (pathname || '').toLowerCase();
    return path.endsWith('/upload.html') || path.endsWith('upload.html') ||
           path.endsWith('/download.html') || path.endsWith('download.html');
  }

  function getRouteKey(pathname) {
    const path = (pathname || window.location.pathname).split('?')[0].split('#')[0].replace(/\/+$/, '');

    if (!path || path === '/' || path.endsWith('/index.html')) {
      return 'home';
    }
    if (path.endsWith('/archive.html')) {
      return 'archive';
    }
    if (path.endsWith('/about.html')) {
      return 'about';
    }
    if (path.endsWith('/upload.html')) {
      return 'upload';
    }
    if (path.endsWith('/download.html')) {
      return 'download';
    }

    return 'home';
  }

  function updateActiveNav(pathname) {
    const path = (pathname || window.location.pathname).split('?')[0].split('#')[0];

    document.querySelectorAll('.ssh-nav-link').forEach(function (link) {
      const href = link.getAttribute('href') || '';
      const normalizedHref = href.split('?')[0].split('#')[0];
      const isMatch = normalizedHref && path.endsWith(normalizedHref);

      link.classList.toggle('active', isMatch);
    });
  }

  function initPageByRoute(targetUrl) {
    const routeKey = getRouteKey(targetUrl.pathname);

    if (routeKey === 'archive' || routeKey === 'home') {
      if (window.initArchivePage) {
        window.initArchivePage();
      }
      return;
    }

    if (routeKey === 'download') {
      if (window.initDownloadPage) {
        window.initDownloadPage();
      }
    }
  }

  function loadPage(url, shouldPushState) {
    const targetUrl = new URL(url, window.location.href);

    // 💡 遷移先 または 現在地が upload.html / download.html の場合は通常リロード
    if (isExcludedPath(targetUrl.pathname) || isExcludedPath(window.location.pathname)) {
      window.location.assign(targetUrl.href);
      return;
    }

    if (targetUrl.origin !== window.location.origin) {
      window.location.assign(url);
      return;
    }

    if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
      return;
    }

    fetch(targetUrl.pathname + targetUrl.search, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('ページ取得に失敗しました');
        }
        return response.text();
      })
      .then(function (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const incomingShell = doc.querySelector(PAGE_SHELL_SELECTOR);
        const currentShell = document.querySelector(PAGE_SHELL_SELECTOR);
        const incomingMain = doc.querySelector(MAIN_CONTENT_SELECTOR);
        const currentMain = document.querySelector(MAIN_CONTENT_SELECTOR);
        const incomingContent = incomingShell || incomingMain;
        const currentContent = currentShell || currentMain;

        if (!incomingContent || !currentContent) {
          window.location.assign(targetUrl.href);
          return;
        }

        currentContent.innerHTML = incomingContent.innerHTML;
        document.title = doc.title || document.title;
        updateActiveNav(targetUrl.pathname);

        if (shouldPushState) {
          history.pushState({ url: targetUrl.href }, '', targetUrl.href);
        }

        initPageByRoute(targetUrl);
      })
      .catch(function () {
        window.location.assign(targetUrl.href);
      });
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a');

    if (!link) {
      return;
    }

    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank') {
      return;
    }

    const targetUrl = new URL(href, window.location.href);
    if (targetUrl.origin !== window.location.origin) {
      return;
    }

    // 💡 リンク先、または現在地が upload/download の場合は PJAX ではなく通常遷移
    if (isExcludedPath(targetUrl.pathname) || isExcludedPath(window.location.pathname)) {
      return;
    }

    event.preventDefault();
    loadPage(targetUrl.href, true);
  });

  window.addEventListener('popstate', function () {
    // 💡 戻る・進む操作でも upload/download が絡む場合はフルリロード
    if (isExcludedPath(window.location.pathname)) {
      window.location.reload();
      return;
    }
    loadPage(window.location.href, false);
  });

  window.SSHRouter = {
    loadPage: loadPage,
    initCurrentPage: function () {
      updateActiveNav(window.location.pathname);
      initPageByRoute(new URL(window.location.href));
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    updateActiveNav(window.location.pathname);
    initPageByRoute(new URL(window.location.href));
  });
})();
/**
 * Document HTML clip + runtime seek — dùng chung preview iframe và Puppeteer prerender.
 * Mọi animation (CSS/JS) nên lắng nghe `shortvideo:seek` hoặc đọc `window.__shortVideoClipTimeSec`.
 */
export const HTML_CLIP_RUNTIME_BOOTSTRAP = `(function () {
  function seekCssAnimations(timeSec) {
    var timeMs = Math.max(0, timeSec) * 1000;
    if (typeof document.getAnimations === 'function') {
      document.getAnimations().forEach(function (animation) {
        try {
          animation.pause();
          animation.currentTime = timeMs;
        } catch (error) {
          /* ignore */
        }
      });
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll('*'), function (el) {
      var style = window.getComputedStyle(el);
      if (!style || !style.animationName || style.animationName === 'none') {
        return;
      }
      el.style.animationPlayState = 'paused';
      var delaySec = parseFloat(style.animationDelay) || 0;
      if (!Number.isFinite(delaySec)) {
        delaySec = 0;
      }
      el.style.animationDelay = (delaySec - timeSec) + 's';
    });
  }

  window.__shortVideoClipTimeSec = 0;
  window.__shortVideoSeekTo = function (timeSec) {
    var nextSec = Math.max(0, Number(timeSec) || 0);
    window.__shortVideoClipTimeSec = nextSec;
    seekCssAnimations(nextSec);
    window.dispatchEvent(new CustomEvent('shortvideo:seek', {
      detail: { timeSec: nextSec },
    }));
  };

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'shortvideo-seek') {
      return;
    }
    window.__shortVideoSeekTo(data.timeSec);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.__shortVideoSeekTo(0);
    });
  } else {
    window.__shortVideoSeekTo(0);
  }
})();`;

export function buildHtmlClipDocument(
    clip: { html?: string; css?: string; js?: string },
    options?: { width?: number; height?: number }
): string {
    const width = options?.width ?? 1080;
    const height = options?.height ?? 1920;
    const htmlBody = clip.html?.trim() || '<div id="app"></div>';
    const css = clip.css?.trim() || '';
    const js = clip.js?.trim() || '';
    const isFullDocument = /<!DOCTYPE/i.test(htmlBody) || /<html[\s>]/i.test(htmlBody);

    if (isFullDocument) {
        if (htmlBody.includes('__shortVideoSeekTo')) {
            return htmlBody;
        }
        const injectScript = `<script>${HTML_CLIP_RUNTIME_BOOTSTRAP}<\/script>`;
        if (/<\/body>/i.test(htmlBody)) {
            return htmlBody.replace(/<\/body>/i, `${injectScript}</body>`);
        }
        return `${htmlBody}\n${injectScript}`;
    }

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${width}, height=${height}, initial-scale=1" />
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }
${css}
</style>
</head>
<body>
${htmlBody}
<script>${HTML_CLIP_RUNTIME_BOOTSTRAP}<\/script>
${js ? `<script>${js}<\/script>` : ''}
</body>
</html>`;
}

(() => {
  const hex = (value, fallback = '#a78bfa') =>
    /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
  const element = (tag, text, css) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (css) node.style.cssText = css;
    return node;
  };
  const escapeHtml = text => text.replace(/[&<>"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[char]);
  const decodeEntities = text => text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x[0-9a-f]+|#\d+);/gi, entity => {
    const named = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': '\u00a0',
      '&#39;': "'"
    };
    const lower = entity.toLowerCase();
    if (named[lower]) return named[lower];
    const hex = lower.match(/^&#x([0-9a-f]+);$/);
    const decimal = lower.match(/^&#(\d+);$/);
    const point = hex ? parseInt(hex[1], 16) : decimal ? Number(decimal[1]) : NaN;
    return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });

  function sanitizeInlineMarkup(value) {
    const source = String(value || '');
    const tokenPattern = /<\/?(?:strong|b|em|i|u|br)\s*>|<span\s+style=(["'])color:\s*(#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))\s*;?\s*\1\s*>|<\/span\s*>/gi;
    const tags = [...source.matchAll(tokenPattern)];
    const stack = [];
    let result = '';
    let offset = 0;
    const escapeText = value => {
      let decoded = value;
      for (let i = 0; i < 3; i++) {
        const next = decodeEntities(decoded);
        if (next === decoded) break;
        decoded = next;
      }
      return escapeHtml(decoded.replace(/<\/\s*b\s*>/gi, ''));
    };
    tags.forEach(match => {
      const [tag, , color] = match;
      const index = match.index;
      result += escapeText(source.slice(offset, index));
      const rawName = tag.match(/[a-z]+/i)[0].toLowerCase();
      const name = ({ b: 'strong', i: 'em' })[rawName] || rawName;
      if (name === 'br') {
        result += '<br>';
      } else if (tag.startsWith('</')) {
        const stackIndex = stack.lastIndexOf(name);
        if (stackIndex !== -1) {
          while (stack.length > stackIndex) result += `</${stack.pop()}>`;
        }
      } else if (name === 'span' && color) {
        const rgb = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
        const hexColor = rgb
          ? rgb.slice(1).map(channel => Math.min(Number(channel), 255).toString(16).padStart(2, '0')).join('')
          : color.slice(1);
        result += `<span style="color:#${hexColor.toUpperCase()}">`;
        stack.push('span');
      } else {
        result += `<${name}>`;
        stack.push(name);
      }
      offset = index + tag.length;
    });
    result += escapeText(source.slice(offset));
    while (stack.length) result += `</${stack.pop()}>`;
    return result;
  }

  function formattedElement(tag, text, css) {
    const node = element(tag, null, css);
    node.innerHTML = sanitizeInlineMarkup(text);
    return node;
  }

  function plainInlineText(value) {
    const text = document.createElement('span');
    text.innerHTML = sanitizeInlineMarkup(value);
    return text.textContent || '';
  }

  function renderBlock(block, accent) {
    const color = hex(block.color, accent);
    const wrapper = element('div', null, 'margin:22px 0;');

    if (['counterexamples', 'comparison', 'cards'].includes(block.type) && block.title) {
      wrapper.append(element(
        'h2',
        null,
        `margin:0 0 14px;font-family:'VT323',monospace;letter-spacing:.08em;font-size:21px;color:${color}`
      ));
      wrapper.lastElementChild.innerHTML = sanitizeInlineMarkup(block.title);
    }

    if (block.type === 'section_heading' || block.type === 'heading') {
      wrapper.append(element(
        'h2',
        null,
        `font-family:'VT323',monospace;letter-spacing:.08em;font-size:25px;color:${color};padding-bottom:8px;border-bottom:1px solid ${color}55`
      ));
      wrapper.lastElementChild.innerHTML = sanitizeInlineMarkup(block.title || block.content);
    } else if (block.type === 'quote') {
      wrapper.append(element(
        'blockquote',
        null,
        `margin:0;padding:14px 20px;border-left:4px solid ${color};background:${color}10;font-style:italic;font-weight:400;line-height:1.8;white-space:pre-wrap`
      ));
      wrapper.lastElementChild.innerHTML = sanitizeInlineMarkup(block.content);
    } else if (block.type === 'takeaway') {
      const callout = element(
        'section',
        null,
        `padding:16px 20px;border:1px solid ${color};background:${color}10;border-radius:2px;`
      );
      callout.append(element(
        'h3',
        null,
        `margin:0 0 12px;color:${color};font-family:'VT323',monospace;font-size:22px;letter-spacing:.06em`
      ));
      callout.lastElementChild.innerHTML = sanitizeInlineMarkup(block.title || block.label || '🎯 Key Takeaway');
      if (block.content) callout.append(formattedElement('p', block.content, 'line-height:1.8;white-space:pre-wrap'));
      if (block.items?.length) {
        const list = element('ul', null, 'padding-left:22px;line-height:1.9;');
        block.items.forEach(item => {
          const text = typeof item === 'string' ? item : item.content || item.label || '';
          list.append(formattedElement('li', text, item.warn ? 'color:#fbbf24;' : ''));
        });
        callout.append(list);
      }
      if (block.note) {
        callout.append(element(
          'div',
          null,
          `margin-top:12px;padding:10px 14px;border:1px solid ${color}55;font-style:italic;line-height:1.7;white-space:pre-wrap`
        ));
        callout.lastElementChild.innerHTML = sanitizeInlineMarkup(block.note);
      }
      wrapper.append(callout);
    } else if (block.type === 'callout') {
      const callout = element(
        'div',
        null,
        `padding:14px 18px;border:1px solid ${color};border-left-width:4px;background:${color}12;line-height:1.8;white-space:pre-wrap;`
      );
      if (block.label || block.title || block.type === 'takeaway') {
        callout.append(formattedElement('strong', `${block.label || block.title || '🎯 Key takeaway'}  `, `color:${color};font:22px 'VT323',monospace;letter-spacing:.04em`));
      }
      callout.append(formattedElement('span', block.content || ''));
      wrapper.append(callout);
    } else if (block.type === 'counterexamples') {
      const grid = element('div', null, 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;');
      (block.items || []).forEach((item, index) => {
        const itemColor = hex(item.color, color);
        const card = element('article', null, `padding:18px 20px;border:1px solid rgba(167,139,250,.16);border-left:4px solid ${itemColor};background:rgba(10,4,20,.45);`);
        card.append(formattedElement('h3', item.title || `${index + 1}. Tình huống`, `margin:0 0 12px;color:${itemColor};font:22px 'VT323',monospace;letter-spacing:.04em;`));
        if (item.goal) {
          const goal = element('p', null, 'line-height:1.7;margin:0 0 10px;');
          goal.append(element('strong', 'Mục tiêu: ', `color:${itemColor};`), formattedElement('span', item.goal));
          card.append(goal);
        }
        if (item.quote) card.append(formattedElement(
          'blockquote',
          `“${item.quote}”`,
          `margin:12px 0;padding:14px 18px;border:1px solid ${itemColor};background:${itemColor}10;font-style:italic;font-weight:400;line-height:1.7;white-space:pre-wrap`
        ));
        if (item.insight) {
          const insight = element('p', null, 'line-height:1.7;margin:10px 0 0;');
          insight.append(formattedElement('strong', `→ ${item.insight}`, `color:${itemColor};`));
          card.append(insight);
        }
        grid.append(card);
      });
      wrapper.append(grid);
    } else if (block.type === 'cards') {
      const grid = element('div', null, 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;');
      (block.items || []).forEach(item => {
        const itemColor = hex(item.color, color);
        const card = element('article', null, `padding:18px;border:1px solid ${itemColor}55;border-left:4px solid ${itemColor}`);
        card.append(
          formattedElement('h3', item.title || item.label, `margin:0 0 12px;color:${itemColor};font:22px 'VT323',monospace;letter-spacing:.04em`),
          formattedElement('div', item.content, 'line-height:1.75;white-space:pre-wrap')
        );
        if (item.note) card.append(formattedElement('p', item.note, `color:${itemColor};line-height:1.7`));
        grid.append(card);
      });
      wrapper.append(grid);
    } else if (block.type === 'comparison') {
      const grid = element('div', null, 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;');
      (block.items || []).forEach(item => {
        const itemColor = hex(item.color, color);
        const card = element('article', null, `padding:18px 20px;border:1px solid rgba(167,139,250,.16);border-left:4px solid ${itemColor};background:rgba(10,4,20,.45);`);
        card.append(formattedElement('h3', item.label || item.title || '', `margin:0 0 12px;color:${itemColor};font:22px 'VT323',monospace;letter-spacing:.04em;`));
        if (item.points?.length) {
          const list = element('ul', null, 'padding:0;list-style:none;line-height:1.8;margin:0 0 12px;');
          const marker = /^(#fb7185|#ef4444|#ff4466)$/i.test(itemColor) ? '✕' : '✓';
          item.points.forEach(point => {
            const line = element('li', null, 'display:flex;gap:10px;margin:6px 0;');
            line.append(
              element('strong', marker, `color:${itemColor};flex:0 0 14px;`),
              formattedElement('span', point)
            );
            list.append(line);
          });
          card.append(list);
        }
        if (item.content) card.append(formattedElement('p', item.content, 'line-height:1.7;white-space:pre-wrap;'));
        if (item.quote) card.append(formattedElement(
          'blockquote',
          `“${item.quote}”`,
          `margin:12px 0 0;padding:14px 18px;border:1px solid ${itemColor};background:${itemColor}10;font-style:italic;font-weight:400;line-height:1.7;white-space:pre-wrap`
        ));
        grid.append(card);
      });
      wrapper.append(grid);
    } else if (block.type === 'flow') {
      const grid = element('div', null, 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;');
      (block.items || []).forEach(item => {
        const itemColor = hex(item.color, color);
        const step = element('div', null, `padding:16px;text-align:center;border:1px solid ${itemColor};line-height:1.6`);
        step.append(
          formattedElement('h3', item.label || item.title || '', `margin:0 0 8px;color:${itemColor};font:22px 'VT323',monospace;letter-spacing:.04em`),
          formattedElement('p', item.content || '', 'margin:0;white-space:pre-wrap;color:var(--text-muted);font-weight:400;')
        );
        grid.append(step);
      });
      wrapper.append(grid);
    } else if (block.type === 'table') {
      const table = element('table', null, `width:100%;border-collapse:collapse;border:1px solid ${color}66`);
      const header = element('tr');
      (block.headers || []).forEach(value => header.append(formattedElement(
        'th', value, `padding:12px;text-align:left;color:${color};font:22px 'VT323',monospace;letter-spacing:.04em;border-bottom:1px solid ${color}66`
      )));
      table.append(header);
      (block.rows || []).forEach(row => {
        const tableRow = element('tr');
        row.forEach(value => tableRow.append(formattedElement(
          'td', value, 'padding:12px;border-bottom:1px solid rgba(167,139,250,.15)'
        )));
        table.append(tableRow);
      });
      wrapper.append(table);
    } else if (block.type === 'list') {
      const list = element('ol', null, 'list-style:none;padding:0;line-height:1.8;');
      (block.items || []).forEach((item, index) => {
        const row = element('li', null, 'display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;margin:10px 0;color:var(--text-muted);');
        row.append(
          element('span', `[${String(index + 1).padStart(2, '0')}]`, `color:${color};font:22px 'VT323',monospace;letter-spacing:.03em;`),
          formattedElement('span', item, 'line-height:1.7;')
        );
        list.append(row);
      });
      wrapper.append(list);
    } else {
      wrapper.append(formattedElement('p', block.content, `line-height:1.8;white-space:pre-wrap;color:${color}`));
    }

    return wrapper;
  }

  function renderArticle(article, target, options = {}) {
    const accent = hex(article.tag_color);
    const panel = element('article');
    panel.className = options.className || 'panel';
    if (options.id) panel.id = options.id;

    if (options.backButton) {
      const backButton = element(
        'button',
        '← Quay về mục lục',
        `border:1px solid ${accent}88;background:${accent}14;color:${accent};padding:8px 12px;`
      );
      backButton.type = 'button';
      backButton.className = 'back-btn';
      backButton.addEventListener('click', () => window.goHome());
      panel.append(backButton);
    }

    const header = element('header', null, 'margin-bottom:28px;');
    if (article.tag_label) {
      header.append(element(
        'div',
        article.tag_label,
        `display:inline-block;padding:6px 18px;color:${accent};border:1px solid ${accent}88;background:${accent}14;font:12px 'Share Tech Mono',monospace;letter-spacing:.14em;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))`
      ));
    }
    header.append(formattedElement(
      'h1',
      article.title || 'Bài viết chưa có tiêu đề',
      `margin:12px 0 8px;font:clamp(38px,5vw,58px)/1 'VT323',monospace;letter-spacing:.04em;color:${accent}`
    ));
    if (article.subtitle) header.append(formattedElement('p', article.subtitle, 'font-size:17px;color:var(--text-muted);line-height:1.7'));
    if (article.quote) {
      header.append(formattedElement(
        'blockquote',
        article.quote,
        `margin:16px 0;padding:14px 20px;border-left:4px solid ${accent};background:${accent}10;font-style:italic;font-weight:400;line-height:1.8;white-space:pre-wrap`
      ));
    }
    panel.append(header);
    (Array.isArray(article.sections) ? article.sections : []).forEach(section => panel.append(renderBlock(section, accent)));
    target.replaceChildren(panel);
    return panel;
  }

  window.renderKnowledgeArticle = renderArticle;
  window.sanitizeKnowledgeInlineMarkup = sanitizeInlineMarkup;

  async function loadApprovedSubmissions() {
    const page = window.KNOWLEDGE_PAGE_KEY;
    if (!page || !window.supabaseClient) return;

    let query = window.supabaseClient
      .from('knowledge_submissions')
      .select('*')
      .eq('status', 'approved');
    if (page === 'kt41') query = query.or('page_key.eq.kt41,page_key.is.null');
    else query = query.eq('page_key', page);
    const { data, error } = await query.order('approved_at', { ascending: false });

    if (error) {
      console.error('[SUBMISSIONS] Could not load approved articles:', error);
      return;
    }

    const content = document.querySelector('.content') || document.querySelector('main');
    const nav = document.querySelector('.sidebar-nav');
    (data || []).forEach(article => {
      const id = `knowledge-${article.id}`;
      const existing = document.getElementById(id);
      if (existing) return;

      const panel = document.createElement('section');
      panel.id = id;
      panel.className = 'panel';
      renderArticle(article, panel, { className: 'knowledge-article', backButton: true });
      content.append(panel);

      const titleText = plainInlineText(article.title || 'Bài viết chưa có tiêu đề');
      const openArticle = () => {
        document.querySelectorAll('.panel').forEach(item => item.classList.remove('active'));
        panel.classList.add('active');
        const title = document.getElementById('topbar-title');
        if (title) title.textContent = titleText;
        window.scrollTo(0, 0);
      };

      if (nav) {
        const link = element('a', `●  ${titleText}`, `display:block;padding:8px 10px;color:${hex(article.tag_color)};text-decoration:none;font-size:12px;cursor:pointer`);
        link.href = '#';
        link.addEventListener('click', event => {
          event.preventDefault();
          openArticle();
        });
        nav.append(link);
      }

      const grid = document.getElementById('mini-home-grid') || document.querySelector('.mini-home-grid');
      if (grid) {
        const card = element('button', null, `width:100%;text-align:left;cursor:pointer;border-left:3px solid ${hex(article.tag_color)};`);
        card.className = 'mini-card';
        card.type = 'button';
        card.append(
          formattedElement('div', article.title || 'Bài viết chưa có tiêu đề', 'font-weight:700;color:var(--text);margin-bottom:4px;line-height:1.3;'),
          element('div', article.subtitle || 'Bài viết cộng đồng', 'font-size:12px;color:var(--text-muted);line-height:1.45;')
        );
        card.firstElementChild.className = 'mc-title';
        card.lastElementChild.className = 'mc-desc';
        card.addEventListener('click', openArticle);
        grid.append(card);
      }
    });
  }

  if (window.currentProfile) loadApprovedSubmissions();
  window.addEventListener('access-granted', loadApprovedSubmissions);
})();

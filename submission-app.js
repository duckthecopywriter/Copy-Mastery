(() => {
  const TYPES = [
    ['text', 'Textbox nội dung'],
    ['section_heading', 'Headline / tiêu đề mục'],
    ['quote', 'Quote'],
    ['list', 'Danh sách'],
    ['callout', 'Callout'],
    ['takeaway', 'Key takeaway'],
    ['counterexamples', 'Case studies / ví dụ theo bối cảnh'],
    ['cards', 'Các thẻ kiến thức'],
    ['comparison', 'So sánh'],
    ['flow', 'Flow nhiều cột'],
    ['table', 'Bảng']
  ];
  const $ = selector => document.querySelector(selector);
  const params = new URLSearchParams(location.search);
  const articleId = params.get('id');
  let article = {
    title: '',
    subtitle: '',
    tag_label: '',
    tag_color: '#a78bfa',
    quote: '',
    page_key: params.get('page') || 'kt41',
    sections: []
  };
  let busy = false;
  let initialized = false;
  const PAGE_KEYS = ['kt41', 'neuro', 'tu-duy', 'fb-ads', 'tl17', 'tools', 'luyen-tap'];
  const RICH_FIELDS = new Set(['content', 'quote', 'goal', 'insight', 'note', 'block-note', 'points', 'block-items']);

  function setStatus(message, type) {
    const status = $('#editor-status');
    status.textContent = message;
    status.className = `status ${type}`;
  }

  function setImportStatus(message, type) {
    const status = $('#ai-import-status');
    status.textContent = message;
    status.className = `status ${type}`;
  }

  function makeAiPrompt() {
    const pageNames = {
      kt41: '41 Kỹ thuật bán hàng',
      neuro: 'Neuroscience',
      'tu-duy': 'Tư duy Copywriting',
      'fb-ads': 'Copy in Action',
      tl17: '17 nguyên tắc tâm lý học',
      tools: 'Copywriting Tools',
      'luyen-tap': 'Luyện tập'
    };
    return `Bạn là biên tập viên kiêm người thiết kế bố cục cho kho kiến thức CopyHub bằng tiếng Việt.
Hãy biến GHI CHÚ THÔ bên dưới thành một bài rõ ràng, dễ quét mắt, có nhịp điệu thị giác và trung thành với thông tin gốc. Hãy ưu tiên cách trình bày như một trang hướng dẫn được biên tập kỹ: tiêu đề mục ngắn, danh sách đánh số khi có trình tự, và các thẻ riêng khi có nhiều tuần/bước/khái niệm ngang hàng. Tránh biến toàn bài thành những đoạn văn dài hoặc chỉ dùng một kiểu block. Không tự bịa dữ kiện, nghiên cứu, số liệu hoặc trích dẫn; nếu thiếu dữ kiện, diễn đạt thận trọng hoặc bỏ qua.

Trang dự kiến: ${pageNames[$('#article-page').value] || $('#article-page').value} (page_key: ${$('#article-page').value}).

TƯ DUY BỐ CỤC VÀ MÀU SẮC:
- Hãy chia nội dung theo nhóm có ý nghĩa; mỗi nhóm có tiêu đề ngắn, nội dung vừa đủ và khoảng nghỉ. Dùng "cards" cho các mục ngang hàng, "list" cho các bước/trình tự (viết theo đúng thứ tự và gọn như checklist [01], [02]...), "counterexamples" cho các tình huống có bối cảnh/mục tiêu/câu ví dụ/bài học, "comparison" cho hai hướng đối lập, "flow" cho tiến trình ngắn. Chỉ dùng block phù hợp, không ép nội dung vào đủ mọi loại.
- Tự động bọc tiêu đề bài ("title"), mọi tiêu đề mục ("section_heading.title") và tiêu đề ngắn của card/callout/takeaway/item bằng <strong>...</strong> để chúng nổi bật. Chỉ bọc phần chữ tiêu đề, không bọc cả nội dung dài. Khi cần nhấn mạnh trong nội dung, chỉ dùng thẻ inline <strong>, <em>, <u>, <br> hoặc <span style="color:#RRGGBB"> với màu hợp bảng màu; không dùng Markdown, thuộc tính HTML khác, CSS khác hay thẻ khác. Quote giữ kiểu chữ thường; chỉ dùng đậm/nghiêng/gạch chân/màu nếu thật sự có chủ đích.
- Giao diện CopyHub nền tím đen tối, chữ thân bài sáng dịu; tiêu đề được website hiển thị bằng font pixel 8-bit. Chỉ mô tả nội dung, không thêm trường font hay CSS vào JSON.
- Màu sắc: nền trang tối nên dùng màu chữ thân bài sáng, dễ đọc (ưu tiên #E0D8F0 hoặc trắng dịu); không tô cả đoạn văn dài bằng màu nhấn. Đặc biệt, mọi block "text" phải có "color":"#E0D8F0" để nội dung không bị tô tím mặc định. Chỉ tô màu cho heading, nhãn, viền/nhóm card và cụm từ ngắn thật sự cần nhấn.
- Chọn màu nhấn có chủ đích, đa dạng nhưng tiết chế: xanh dương #60A5FA (thông tin), xanh ngọc #22D3EE (liên kết/ý mới), xanh lá #34D399 (đúng/tiến bộ), vàng hổ phách #FBBF24 (lưu ý), hồng #E879F9 (ví dụ/điểm nhấn), tím #A78BFA (khái niệm). Mỗi bài dùng khoảng 2-4 màu nhấn, giữ màu nhất quán trong cùng nhóm và tương phản tốt trên nền tối. Không mặc định chọn tím: hãy chọn "tag_color" theo chủ đề bài, luân phiên các màu phù hợp giữa các bài; màu tím chỉ dùng khi thực sự hợp nội dung. Gán màu rõ ràng cho từng block và item có trường "color"; giữ phần thân bài sáng, không dùng màu nhấn cho đoạn dài.
- Tạo phân cấp rõ: tiêu đề bài súc tích, subtitle giải thích lợi ích/phạm vi, nhãn ngắn; quote chỉ dùng nếu có trong ghi chú hoặc là câu ví dụ được ghi chú hỗ trợ.

CHỈ trả về một object JSON hợp lệ, không markdown/code fence, không giải thích bên ngoài JSON. Dùng đúng cấu trúc:
{
  "title": "<strong>Tiêu đề bài</strong>",
  "subtitle": "Phụ đề ngắn hoặc chuỗi rỗng",
  "tag_label": "Nhãn ngắn hoặc chuỗi rỗng",
  "tag_color": "#34D399",
  "quote": "Quote mở đầu hoặc chuỗi rỗng",
  "page_key": "${$('#article-page').value}",
  "sections": [
    {"type":"section_heading","title":"<strong>Tiêu đề mục</strong>","content":"","color":"#22D3EE"},
    {"type":"text","content":"Đoạn giải thích","color":"#E0D8F0"},
    {"type":"quote","content":"Câu trích dẫn"},
    {"type":"list","items":["Ý một","Ý hai"]},
    {"type":"callout","title":"Lưu ý","content":"Nội dung"},
    {"type":"counterexamples","title":"Các ví dụ theo bối cảnh","items":[{"title":"Bối cảnh","goal":"Mục tiêu/belief","quote":"Câu ví dụ","insight":"Giải thích","color":"#60A5FA"}]},
    {"type":"comparison","title":"So sánh tốt và kém","items":[{"label":"Framing kém","points":["Điểm một","Điểm hai"],"quote":"Ví dụ","content":"Giải thích","color":"#E879F9"},{"label":"Framing tốt","points":["Điểm một"],"quote":"Ví dụ","content":"Giải thích","color":"#34D399"}]},
    {"type":"cards","title":"Các khái niệm","items":[{"title":"<strong>Tên card</strong>","content":"Giải thích","note":"Ghi chú tùy chọn","color":"#22D3EE"}]},
    {"type":"flow","items":[{"label":"Bước 1","content":"Mô tả bước","color":"#60A5FA"}]},
    {"type":"takeaway","title":"🎯 Key Takeaway","content":"Tóm tắt tùy chọn","items":[{"content":"Ý chính","warn":false},{"content":"Cảnh báo","warn":true}],"note":"Câu chốt tùy chọn"},
    {"type":"table","headers":["Mã","Khái niệm","Loại"],"rows":[["LF1","Ví dụ","Sinh học"]]}
  ]
}

Chọn các block phù hợp với ghi chú; không cần dùng tất cả. Mỗi list phải có thứ tự có ý nghĩa; nếu ghi chú không có trình tự thì dùng cards hoặc nhóm theo chủ đề thay vì đánh số giả. Luôn bọc tiêu đề bài và tiêu đề mục bằng <strong>, đồng thời đặt màu chữ body sáng cho từng block "text". Chọn mã màu #RRGGBB theo đúng bảng màu và nguyên tắc trên; đừng lặp màu tím làm màu chủ đạo mặc định. Giữ các ý chính, loại bỏ lặp ý và sắp xếp sections theo trình tự dễ học.

GHI CHÚ THÔ:
[DÁN GHI CHÚ CỦA TÔI VÀO ĐÂY]`;
  }

  function normalizeAiBlock(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    const aliases = { heading: 'section_heading', paragraph: 'text' };
    const type = aliases[source.type] || source.type;
    if (!TYPES.some(([value]) => value === type)) return null;
    const text = value => typeof value === 'string' ? value : '';
    const color = /^#[0-9a-f]{6}$/i.test(source.color || '') ? source.color : '#a78bfa';
    const block = { type, color };

    if (['section_heading', 'callout', 'takeaway'].includes(type)) {
      block.title = text(source.title || source.label);
      block.label = block.title;
    }
    if (['text', 'section_heading', 'quote', 'callout'].includes(type)) {
      block.content = text(source.content);
    }
    if (['counterexamples', 'comparison', 'cards', 'flow'].includes(type)) {
      block.title = text(source.title);
      block.items = (Array.isArray(source.items) ? source.items : []).map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const itemColor = /^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color : color;
        if (type === 'counterexamples') {
          return {
            title: text(item.title || item.label),
            goal: text(item.goal),
            quote: text(item.quote),
            insight: text(item.insight || item.content),
            color: itemColor
          };
        }
        if (type === 'comparison') {
          return {
            label: text(item.label || item.title),
            points: (Array.isArray(item.points) ? item.points : []).filter(value => typeof value === 'string'),
            quote: text(item.quote),
            content: text(item.content),
            color: itemColor
          };
        }
        if (type === 'cards') {
          return {
            title: text(item.title || item.label),
            content: text(item.content),
            note: text(item.note),
            color: itemColor
          };
        }
        return { label: text(item.label || item.title), content: text(item.content), color: itemColor };
      }).filter(Boolean);
    }
    if (type === 'list') {
      block.items = (Array.isArray(source.items) ? source.items : []).filter(value => typeof value === 'string');
    }
    if (type === 'takeaway') {
      block.content = text(source.content);
      block.items = (Array.isArray(source.items) ? source.items : []).map(item => {
        if (typeof item === 'string') return { content: item, warn: false };
        if (!item || typeof item !== 'object') return null;
        return { content: text(item.content || item.label), warn: Boolean(item.warn) };
      }).filter(Boolean);
      block.note = text(source.note);
    }
    if (type === 'table') {
      block.headers = (Array.isArray(source.headers) ? source.headers : []).filter(value => typeof value === 'string');
      block.rows = (Array.isArray(source.rows) ? source.rows : [])
        .filter(Array.isArray)
        .map(row => row.map(value => text(value)));
    }
    return block;
  }

  function parseAiResponse(raw) {
    const cleaned = raw.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    const result = parsed.article && typeof parsed.article === 'object' ? parsed.article : parsed;
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('Kết quả cần là một object JSON.');
    }
    if (typeof result.title !== 'string' || !result.title.trim()) {
      throw new Error('JSON cần có trường "title" dạng chuỗi và không để trống.');
    }
    if (!Array.isArray(result.sections) || result.sections.length === 0) {
      throw new Error('JSON cần có mảng "sections" chứa ít nhất một block.');
    }
    const sections = result.sections.map(normalizeAiBlock).filter(Boolean);
    if (!sections.length) throw new Error('Không tìm thấy block hợp lệ trong "sections".');
    const color = /^#[0-9a-f]{6}$/i.test(result.tag_color || '') ? result.tag_color : '#a78bfa';
    return {
      title: result.title.trim().slice(0, 180),
      subtitle: typeof result.subtitle === 'string' ? result.subtitle.trim().slice(0, 300) : '',
      tag_label: typeof result.tag_label === 'string' ? result.tag_label.trim().slice(0, 80) : '',
      tag_color: color,
      quote: typeof result.quote === 'string' ? result.quote.trim() : '',
      page_key: PAGE_KEYS.includes(result.page_key) ? result.page_key : $('#article-page').value,
      sections
    };
  }

  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(makeAiPrompt());
      setImportStatus('Đã copy prompt. Dán prompt vào AI bên ngoài và thay phần ghi chú bằng nội dung của bạn.', 'success');
    } catch (error) {
      console.error('[AI IMPORT] Could not copy prompt:', error);
      setImportStatus('Không copy được tự động. Trình duyệt có thể chặn clipboard; hãy thử chạy trang bằng localhost/HTTPS.', 'error');
    }
  }

  function importAiResponse() {
    try {
      const imported = parseAiResponse($('#ai-response').value);
      fillEditor(imported);
      setImportStatus('Đã nạp JSON vào editor. Hãy kiểm tra preview và chỉnh lại nội dung trước khi gửi.', 'success');
    } catch (error) {
      console.error('[AI IMPORT] Could not parse AI response:', error);
      setImportStatus(`Không nạp được kết quả: ${error.message}`, 'error');
    }
  }

  function button(text, action, danger = false) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = text;
    control.className = danger ? 'button danger' : 'button';
    control.addEventListener('click', action);
    return control;
  }

  function applyInlineFormat(editor, command) {
    editor.focus();
    document.execCommand(command, false);
    renderPreview();
  }

  function applyInlineColor(editor, color, savedRange) {
    if (!savedRange || !editor.contains(savedRange.commonAncestorContainer) || savedRange.collapsed) return;
    editor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
    const range = selection.getRangeAt(0);
    const mark = document.createElement('span');
    mark.style.color = color;
    mark.append(range.extractContents());
    range.insertNode(mark);
    range.selectNodeContents(mark);
    selection.removeAllRanges();
    selection.addRange(range);
    renderPreview();
  }

  function createRichEditor(value = '', className = '') {
    const editor = document.createElement('div');
    editor.className = `rich-editor ${className}`.trim();
    editor.contentEditable = 'true';
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.dataset.richText = 'true';
    editor.innerHTML = window.sanitizeKnowledgeInlineMarkup(value);
    let savedRange = null;
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (selection.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
    };
    ['keyup', 'mouseup', 'focus'].forEach(name => editor.addEventListener(name, rememberSelection));

    const toolbar = document.createElement('div');
    toolbar.className = 'format-toolbar';

    // B / I / U buttons
    [
      ['B', 'bold', 'Đậm (Ctrl/Cmd+B)'],
      ['I', 'italic', 'Nghiêng (Ctrl/Cmd+I)'],
      ['U', 'underline', 'Gạch chân (Ctrl/Cmd+U)']
    ].forEach(([text, command, title]) => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = `format-button format-${command}`;
      control.textContent = text;
      control.title = title;
      control.setAttribute('aria-label', title);
      control.addEventListener('mousedown', event => event.preventDefault());
      control.addEventListener('click', () => applyInlineFormat(editor, command));
      toolbar.append(control);
    });

    // Divider
    const divider = document.createElement('div');
    divider.className = 'swatch-divider';
    toolbar.append(divider);

    // Color swatches — palette hài hòa với CopyHub
    const SWATCHES = [
      ['#a78bfa', 'Tím (accent)'],
      ['#60a5fa', 'Xanh dương'],
      ['#34d399', 'Xanh lá'],
      ['#fbbf24', 'Vàng hổ phách'],
      ['#e879f9', 'Hồng'],
      ['#ff4466', 'Đỏ hồng'],
      ['#00c8ff', 'Xanh sky'],
      ['#e0d8f0', 'Trắng mờ'],
    ];
    const swatchRow = document.createElement('div');
    swatchRow.className = 'color-swatches';
    SWATCHES.forEach(([color, title]) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.title = title;
      swatch.setAttribute('aria-label', `Màu ${title}`);
      swatch.style.cssText = `background:${color};color:${color};`;
      // mousedown để lưu selection TRƯỚC khi focus rời editor
      swatch.addEventListener('mousedown', event => {
        event.preventDefault(); // giữ selection không bị mất
        rememberSelection();
      });
      swatch.addEventListener('click', () => {
        applyInlineColor(editor, color, savedRange);
      });
      swatchRow.append(swatch);
    });

    // Divider trước custom picker
    const divider2 = document.createElement('div');
    divider2.className = 'swatch-divider';
    swatchRow.append(divider2);

    // Custom color picker (cho màu tùy chỉnh ngoài swatches)
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'format-color-custom';
    colorPicker.value = '#60a5fa';
    colorPicker.title = 'Màu tùy chỉnh';
    colorPicker.setAttribute('aria-label', 'Màu chữ tùy chỉnh');
    // Lưu selection TRƯỚC khi color picker mở (mousedown)
    colorPicker.addEventListener('mousedown', () => rememberSelection());
    // Áp dụng màu khi người dùng chọn xong (change = confirm, input = realtime)
    colorPicker.addEventListener('change', () => {
      applyInlineColor(editor, colorPicker.value, savedRange);
    });
    swatchRow.append(colorPicker);
    toolbar.append(swatchRow);

    editor.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const command = { b: 'bold', i: 'italic', u: 'underline' }[event.key.toLowerCase()];
        if (command) {
          event.preventDefault();
          applyInlineFormat(editor, command);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (editor.classList.contains('title-rich-editor')) return;
        document.execCommand('insertLineBreak', false);
        renderPreview();
      }
    });
    editor.addEventListener('paste', event => {
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    });
    return { editor, toolbar };
  }

  function richField(name, title, value = '', className = '') {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    wrapper.append(document.createTextNode(title));
    const { editor, toolbar } = createRichEditor(value, className);
    editor.dataset.field = name;
    wrapper.append(toolbar, editor);
    return wrapper;
  }

  function controlValue(control) {
    return control?.dataset.richText === 'true'
      ? window.sanitizeKnowledgeInlineMarkup(control.innerHTML)
      : control?.value || '';
  }

  function label(text, input) {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    wrapper.textContent = text;
    wrapper.append(input);
    return wrapper;
  }

  function itemText(block) {
    if (block.type === 'table') return (block.rows || []).map(row => row.join(' | ')).join('\n');
    if (block.type === 'list' || block.type === 'takeaway') {
      return (block.items || []).map(item =>
        typeof item === 'string' ? item : `${item.warn ? '! ' : ''}${item.content || item.label || ''}`
      ).join('\n');
    }
    return (block.items || []).map(item =>
      `${item.label || item.title || ''} | ${item.content || ''} | ${item.color || ''}`
    ).join('\n');
  }

  function field(name, title, value = '', multiline = true) {
    if (RICH_FIELDS.has(name)) return richField(name, title, value);
    const control = document.createElement(multiline ? 'textarea' : 'input');
    control.dataset.field = name;
    control.value = value || '';
    if (multiline) control.rows = 3;
    return label(title, control);
  }

  function colorField(value) {
    const control = document.createElement('input');
    control.type = 'color';
    control.dataset.field = 'color';
    control.value = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#a78bfa';
    return label('Màu nhấn', control);
  }

  function itemFields(type, item = {}) {
    if (type === 'counterexamples') {
      return [
        field('title', 'Tên case / bối cảnh', item.title || item.label, false),
        field('goal', 'Mục tiêu / belief cần tác động', item.goal),
        field('quote', 'Câu hỏi / ví dụ minh họa', item.quote),
        field('insight', 'Insight / giải thích', item.insight || item.content),
        colorField(item.color)
      ];
    }
    if (type === 'comparison') {
      return [
        field('label', 'Tiêu đề cột (ví dụ: Framing kém)', item.label || item.title, false),
        field('points', 'Checklist — mỗi ý một dòng', (item.points || []).join('\n')),
        field('quote', 'Quote / ví dụ minh họa', item.quote, false),
        field('content', 'Giải thích thêm', item.content),
        colorField(item.color)
      ];
    }
    if (type === 'cards') {
      return [
        field('title', 'Tiêu đề card', item.title || item.label, false),
        field('content', 'Nội dung card', item.content),
        field('note', 'Ghi chú / callout (không bắt buộc)', item.note),
        colorField(item.color)
      ];
    }
    return [
      field('label', 'Nhãn / tiêu đề', item.label || item.title, false),
      field('content', 'Nội dung', item.content)
    ];
  }

  function makeItem(type, item = {}) {
    const row = document.createElement('div');
    row.className = 'structured-item';
    row.style.cssText = 'margin:10px 0;padding:12px;border:1px solid rgba(167,139,250,.18);background:rgba(0,0,0,.16);';
    const heading = document.createElement('div');
    heading.className = 'structured-item-heading';
    heading.style.cssText = 'display:flex;align-items:center;justify-content:space-between;color:#a78bfa;font:11px "Share Tech Mono",monospace;';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:5px;';
    actions.append(
      button('↑', () => moveItem(row, -1)),
      button('↓', () => moveItem(row, 1)),
      button('Xóa mục', () => {
        row.remove();
        renumberItems(row.parentElement);
        renderPreview();
      }, true)
    );
    heading.append(document.createTextNode('Mục'), actions);
    row.append(heading, ...itemFields(type, item));
    return row;
  }

  function moveItem(row, direction) {
    const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    row.parentElement.insertBefore(direction < 0 ? row : sibling, direction < 0 ? sibling : row);
    renumberItems(row.parentElement);
    renderPreview();
  }

  function renumberItems(container) {
    [...container.children].forEach((row, index) => {
      const heading = row.querySelector('.structured-item-heading');
      if (heading) heading.firstChild.textContent = `Mục ${index + 1}`;
    });
  }

  function makeBlock(block = { type: 'text', color: '#a78bfa' }) {
    const card = document.createElement('article');
    card.className = 'block';
    const toolbar = document.createElement('div');
    toolbar.className = 'block-toolbar';
    const type = document.createElement('select');
    type.className = 'block-type';
    TYPES.forEach(([value, title]) => type.add(new Option(title, value, false, value === block.type)));
    const color = document.createElement('input');
    color.type = 'color';
    color.className = 'block-color';
    color.value = /^#[0-9a-f]{6}$/i.test(block.color || '') ? block.color : '#a78bfa';
    toolbar.append(type, color, button('Xóa', () => {
      card.remove();
      renderPreview();
    }, true));
    toolbar.append(
      button('↑', () => moveBlock(card, -1)),
      button('↓', () => moveBlock(card, 1))
    );
    card.append(toolbar);
    const fields = document.createElement('div');
    fields.className = 'block-fields';
    card.append(fields);
    const updateVisibility = () => {
      const currentType = type.value;
      fields.replaceChildren();
      const titleInput = document.createElement('input');
      titleInput.className = 'block-title';
      titleInput.maxLength = 180;
      titleInput.value = block.title || block.label || '';
      const itemsInput = document.createElement('textarea');
      itemsInput.className = 'block-items';
      itemsInput.rows = 5;
      itemsInput.value = itemText(block);

      if (['counterexamples', 'comparison', 'cards', 'flow'].includes(currentType)) {
        const list = document.createElement('div');
        list.className = 'structured-items';
        if (['counterexamples', 'comparison', 'cards'].includes(currentType)) {
          fields.append(label('Tiêu đề nhóm / section', titleInput));
        }

        const itemTitle = {
          counterexamples: 'Case / tình huống',
          comparison: 'Cột so sánh',
          cards: 'Card kiến thức',
          flow: 'Bước trong flow'
        }[currentType];
        (block.items || []).forEach(item => list.append(makeItem(currentType, item)));
        const add = button(`+ Thêm ${itemTitle.toLowerCase()}`, () => {
          const item = makeItem(currentType);
          list.append(item);
          renumberItems(list);
          renderPreview();
        });
        fields.append(list, add);
      } else if (currentType === 'takeaway') {
        titleInput.value ||= '🎯 Key Takeaway';
        fields.append(
          label('Tiêu đề takeaway', titleInput),
          richField('block-content', 'Tóm tắt mở đầu (không bắt buộc)', block.content || '', 'block-content'),
          richField('block-items', 'Các ý chính — mỗi ý một dòng (thêm ! đầu dòng để đánh dấu cảnh báo)', itemText(block), 'block-items'),
          field('block-note', 'Câu chốt cuối / ghi chú (không bắt buộc)', block.note || '')
        );
      } else if (currentType === 'table') {
        fields.append(
          label('Tiêu đề cột — cách nhau bằng dấu |', titleInput),
          label('Mỗi dòng là một hàng; các ô cách nhau bằng dấu |', itemsInput)
        );
      } else if (currentType === 'list') {
        fields.append(richField('block-items', 'Mỗi dòng là một ý trong danh sách', itemText(block), 'block-items'));
      } else if (['section_heading', 'callout'].includes(currentType)) {
        fields.append(
          label('Tiêu đề / nhãn', titleInput),
          richField('block-content', 'Nội dung', block.content || '', 'block-content')
        );
      } else {
        fields.append(richField('block-content', 'Nội dung', block.content || '', 'block-content'));
      }

    };
    type.addEventListener('change', updateVisibility);
    updateVisibility();
    return card;
  }

  function moveBlock(block, direction) {
    const sibling = direction < 0 ? block.previousElementSibling : block.nextElementSibling;
    if (!sibling) return;
    block.parentElement.insertBefore(direction < 0 ? block : sibling, direction < 0 ? sibling : block);
    renderPreview();
  }

  function readItems(raw, type) {
    const rows = raw.replace(/<br\s*\/?>/gi, '\n').split('\n').map(line => line.trim()).filter(Boolean);
    if (type === 'table') return rows.map(line => line.split('|').map(value => value.trim()));
    if (type === 'list') return rows;
    return rows.map(line => {
      const [labelText, content, color] = line.split('|').map(value => value.trim());
      return { label: labelText, title: labelText, content: content || '', ...(color ? { color } : {}) };
    });
  }

  function readSections() {
    return [...document.querySelectorAll('.block')].map(card => {
      const type = card.querySelector('.block-type').value;
      const block = { type, color: card.querySelector('.block-color').value };
      const titleInput = card.querySelector('.block-title');
      const contentInput = card.querySelector('.block-content');
      const itemsInput = card.querySelector('.block-items');
      const title = titleInput?.value.trim() || '';
      const content = controlValue(contentInput).trim();
      if (['counterexamples', 'comparison', 'cards', 'flow'].includes(type)) {
        if (['counterexamples', 'comparison', 'cards'].includes(type)) block.title = title;
        block.items = [...card.querySelectorAll('.structured-item')].map(row => {
          const value = name => controlValue(row.querySelector(`[data-field="${name}"]`)).trim();
          const item = {};
          if (type === 'counterexamples') {
            Object.assign(item, { title: value('title'), goal: value('goal'), quote: value('quote'), insight: value('insight') });
          } else if (type === 'comparison') {
            Object.assign(item, {
              label: value('label'),
              points: value('points').replace(/<br\s*\/?>/gi, '\n').split('\n').map(point => point.trim()).filter(Boolean),
              quote: value('quote'),
              content: value('content')
            });
          } else if (type === 'cards') {
            Object.assign(item, { title: value('title'), content: value('content'), note: value('note') });
          } else {
            Object.assign(item, { label: value('label'), content: value('content') });
          }
          item.color = value('color') || card.querySelector('.block-color').value;
          return item;
        }).filter(item => Object.values(item).some(value => Array.isArray(value) ? value.length : Boolean(value)));
      } else if (type === 'takeaway') {
        block.title = title || '🎯 Key Takeaway';
        block.content = content;
        block.items = controlValue(itemsInput).replace(/<br\s*\/?>/gi, '\n').split('\n').map(item => item.trim()).filter(Boolean).map(item => ({
          content: item.replace(/^!\s*/, ''),
          warn: item.startsWith('!')
        }));
        block.note = controlValue(card.querySelector('[data-field="block-note"]')).trim();
      } else if (type === 'table') {
        block.headers = (title || 'Cột 1 | Cột 2').split('|').map(value => value.trim());
        block.rows = readItems(itemsInput?.value || '', type);
      } else if (type === 'list') {
        block.items = readItems(controlValue(itemsInput), type);
      } else {
        block.content = content;
        if (type === 'section_heading' || type === 'callout') {
          block.title = title;
          block.label = title;
        }
      }
      const hasData = block.content || block.items?.length || block.rows?.length ||
        block.title || block.headers?.length || block.note;
      return hasData ? block : null;
    }).filter(Boolean);
  }

  function readArticle() {
    return {
      title: controlValue($('#article-title')).trim(),
      subtitle: $('#article-subtitle').value.trim() || null,
      tag_label: $('#article-tag').value.trim() || null,
      tag_color: $('#article-color').value,
      quote: controlValue($('#article-quote')).trim() || null,
      page_key: $('#article-page').value,
      sections: readSections()
    };
  }

  function renderPreview() {
    if (window.renderKnowledgeArticle) {
      window.renderKnowledgeArticle(readArticle(), $('#article-preview'), { className: 'knowledge-article' });
    }
  }

  function fillEditor(data) {
    article = { ...article, ...data, sections: Array.isArray(data.sections) ? data.sections : [] };
    $('#article-title').innerHTML = window.sanitizeKnowledgeInlineMarkup(article.title || '');
    $('#article-subtitle').value = article.subtitle || '';
    $('#article-tag').value = article.tag_label || '';
    $('#article-color').value = /^#[0-9a-f]{6}$/i.test(article.tag_color || '') ? article.tag_color : '#a78bfa';
    $('#article-quote').innerHTML = window.sanitizeKnowledgeInlineMarkup(article.quote || '');
    $('#article-page').value = article.page_key || 'kt41';
    const blocks = $('#article-blocks');
    blocks.replaceChildren(...article.sections.map(block => makeBlock({
      ...block,
      type: ({ heading: 'section_heading', paragraph: 'text' })[block.type] || block.type
    })));
    if (!article.sections.length) blocks.append(makeBlock());
    renderPreview();
  }

  async function loadArticle() {
    if (window.currentProfile.role !== 'admin') {
      setStatus('Chỉ admin mới được mở và chỉnh sửa submission đã gửi.', 'error');
      $('#submit-button').disabled = true;
      $('#bottom-submit-button').disabled = true;
      return;
    }
    const { data, error } = await window.supabaseClient
      .from('knowledge_submissions')
      .select('*')
      .eq('id', articleId)
      .single();
    if (error) {
      console.error('[SUBMISSION] Could not load article:', error);
      setStatus(`Không tải được bài viết: ${error.message}`, 'error');
      $('#submit-button').disabled = true;
      $('#bottom-submit-button').disabled = true;
      return;
    }
    fillEditor(data);
    $('#submit-button').textContent = 'LƯU THAY ĐỔI';
    $('#bottom-submit-button').textContent = 'LƯU THAY ĐỔI';
    if (data.status === 'pending') {
      const approve = button('LƯU & DUYỆT', () => persist(true));
      approve.className = 'button primary';
      $('#bottom-submit-button').after(approve);
      const reject = button('TỪ CHỐI BÀI', rejectArticle, true);
      $('#bottom-submit-button').after(reject);
    }
  }

  async function rejectArticle() {
    const reason = prompt('Lý do từ chối (không bắt buộc):');
    if (reason === null) return;
    const { error } = await window.supabaseClient
      .from('knowledge_submissions')
      .update({ status: 'rejected', reject_reason: reason.trim() || null })
      .eq('id', articleId);
    if (error) {
      console.error('[SUBMISSION] Reject failed:', error);
      setStatus(`Không từ chối được bài: ${error.message}`, 'error');
      return;
    }
    article.status = 'rejected';
    setStatus('Đã chuyển bài sang trạng thái từ chối.', 'success');
  }

  async function persist(approve = false) {
    if (busy) return;
    const payload = readArticle();
    if (!payload.title) {
      setStatus('Vui lòng nhập tiêu đề bài viết.', 'error');
      return;
    }
    if (!payload.sections.length) {
      setStatus('Bài viết cần có ít nhất một block nội dung.', 'error');
      return;
    }
    if (!articleId && !['mod', 'admin'].includes(window.currentProfile.role)) {
      setStatus('Bạn không có quyền gửi bài.', 'error');
      return;
    }

    busy = true;
    const submitButtons = document.querySelectorAll('#submit-button, #bottom-submit-button');
    submitButtons.forEach(control => { control.disabled = true; });
    let query = window.supabaseClient.from('knowledge_submissions');
    if (articleId) {
      const changes = approve ? {
        ...payload,
        status: 'approved',
        approved_by: window.currentUser.id,
        approved_at: new Date().toISOString()
      } : payload;
      query = query.update(changes).eq('id', articleId);
    } else {
      query = query.insert({
        ...payload,
        submitted_by: window.currentUser.id,
        status: 'pending'
      });
    }
    const { error } = await query;
    busy = false;
    submitButtons.forEach(control => { control.disabled = false; });
    if (error) {
      console.error('[SUBMISSION] Save failed:', error);
      const missingPageKey = /page_key.*(column|schema cache)|(column|schema cache).*page_key/i.test(error.message);
      setStatus(
        missingPageKey
          ? `Bảng knowledge_submissions đang thiếu cột page_key. Chạy File con/add-knowledge-submission-page-key.sql trong Supabase Dashboard > SQL Editor rồi tải lại trang. Chi tiết: ${error.message}`
          : `Không lưu được bài: ${error.message}`,
        'error'
      );
      return;
    }

    article = { ...article, ...payload, ...(approve ? { status: 'approved' } : {}) };
    if (approve) {
      setStatus('Đã lưu và duyệt bài viết.', 'success');
      return;
    }
    if (articleId) {
      setStatus('Đã lưu thay đổi.', 'success');
      return;
    }
    setStatus('Đã gửi thành công. Bài viết đang ở trạng thái chờ duyệt.', 'success');
    $('#submit-button').textContent = 'ĐÃ GỬI';
    $('#bottom-submit-button').textContent = 'ĐÃ GỬI';
    $('#submit-button').disabled = true;
    $('#bottom-submit-button').disabled = true;
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    if (!window.currentProfile || !['mod', 'admin'].includes(window.currentProfile.role)) {
      location.replace('index.html');
      return;
    }

    const titleInput = $('#article-title');
    const titleField = richField('article-title', 'TIÊU ĐỀ *', titleInput.value, 'title-rich-editor');
    const titleEditor = titleField.querySelector('[data-field="article-title"]');
    titleEditor.id = 'article-title';
    titleEditor.setAttribute('aria-label', 'Tiêu đề bài viết');
    titleEditor.setAttribute('aria-required', 'true');
    titleEditor.dataset.placeholder = titleInput.placeholder;
    titleEditor.addEventListener('input', () => {
      const plainText = titleEditor.textContent;
      if (plainText.length > 180) {
        titleEditor.textContent = plainText.slice(0, 180);
        const range = document.createRange();
        range.selectNodeContents(titleEditor);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
    titleInput.closest('label').replaceWith(titleField);

    const quoteInput = $('#article-quote');
    const quoteField = richField('article-quote', 'Quote mở đầu', quoteInput.value);
    quoteField.querySelector('[data-field="article-quote"]').id = 'article-quote';
    quoteInput.closest('label').replaceWith(quoteField);

    $('#back-button').addEventListener('click', () => {
      if (history.length > 1) history.back();
      else location.href = 'index.html';
    });
    $('#add-block').addEventListener('click', () => {
      $('#article-blocks').append(makeBlock());
      renderPreview();
    });
    $('#article-blocks').addEventListener('input', renderPreview);
    $('#article-blocks').addEventListener('change', renderPreview);
    $('.editor').addEventListener('input', renderPreview);
    $('.editor').addEventListener('change', renderPreview);
    $('#copy-ai-prompt').addEventListener('click', copyAiPrompt);
    $('#import-ai-response').addEventListener('click', importAiResponse);
    $('#submit-button').addEventListener('click', () => persist(false));
    $('#bottom-submit-button').addEventListener('click', () => persist(false));

    if (articleId) {
      loadArticle();
    } else {
      fillEditor(article);
    }
  }

  if (window.currentProfile) initialize();
  window.addEventListener('access-granted', initialize, { once: true });
})();

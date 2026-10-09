/* Admin list for community knowledge submissions. Editing happens in submission.html. */
(() => {
  const statuses = ['pending', 'approved', 'rejected'];
  const pageNames = {
    kt41: '41 Kỹ thuật bán hàng',
    neuro: 'Neuroscience',
    'tu-duy': 'Tư duy Copywriting',
    'fb-ads': 'Copy in Action',
    tl17: '17 nguyên tắc tâm lý học',
    tools: 'Copywriting Tools',
    'luyen-tap': 'Luyện tập'
  };
  let filter = 'pending';

  function button(label, onClick) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = label;
    control.style.cssText = 'padding:7px 10px;cursor:pointer;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.1);color:#c4b5fd;font-size:11px;';
    control.addEventListener('click', onClick);
    return control;
  }

  function openEditor(url) {
    location.href = url;
  }

  function renderCard(article) {
    const card = document.createElement('article');
    card.style.cssText = `padding:14px;border:1px solid rgba(167,139,250,.18);border-left:4px solid ${/^#[0-9a-f]{6}$/i.test(article.tag_color || '') ? article.tag_color : '#a78bfa'}`;
    const meta = document.createElement('div');
    const submitter = article.profiles?.username || 'unknown';
    const created = article.created_at ? new Date(article.created_at).toLocaleDateString('vi-VN') : 'chưa rõ ngày';
    meta.textContent = `${pageNames[article.page_key] || article.page_key || 'Chưa chọn trang'} · ${article.status} · ${submitter} · ${created} · ${(article.sections || []).length} blocks`;
    meta.style.cssText = 'font-size:11px;color:rgba(200,190,230,.5)';
    const title = document.createElement('strong');
    title.textContent = article.title || 'Bài viết chưa có tiêu đề';
    title.style.cssText = 'display:block;margin:5px 0;font-size:16px';
    const edit = button(article.status === 'pending' ? 'Xem / chỉnh sửa / duyệt' : 'Xem / chỉnh sửa', () => {
      openEditor(`submission.html?id=${encodeURIComponent(article.id)}`);
    });
    card.append(meta, title, edit);
    return card;
  }

  async function load() {
    const list = document.getElementById('knowledge-studio-list');
    if (!list) return;
    list.textContent = 'Đang tải…';
    const { data, error } = await supabaseClient
      .from('knowledge_submissions')
      .select('*, profiles!knowledge_submissions_submitted_by_fkey(username)')
      .eq('status', filter)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[ADMIN] Could not load submissions:', error);
      list.textContent = `Không tải được bài viết: ${error.message}`;
      return;
    }

    list.replaceChildren(...(data || []).map(renderCard));
    if (!data || data.length === 0) list.textContent = 'Chưa có bài trong mục này.';
  }

  window.loadKnowledgeStudio = () => {
    if (!currentProfile || currentProfile.role !== 'admin') return;
    const root = document.getElementById('admin-submissions-section');
    if (!root) return;
    root.replaceChildren();

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px';
    statuses.forEach(status => {
      toolbar.append(button(status.toUpperCase(), () => {
        filter = status;
        load();
      }));
    });
    toolbar.append(button('+ Bài mới', () => openEditor('submission.html?page=kt41')));

    const list = document.createElement('div');
    list.id = 'knowledge-studio-list';
    root.append(toolbar, list);
    load();
  };
})();

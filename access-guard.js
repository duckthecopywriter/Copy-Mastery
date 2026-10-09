(() => {
  const SUPABASE_URL = 'https://zrgthpeffbmxpzvhorla.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_GmiL6H9E7lbKe-dezbgaLA_f22t79ab';
  const pageNames = {
    'kt41.html': 'kt41',
    'neuro.html': 'neuro',
    'tu-duy.html': 'tu-duy',
    'fb-ads.html': 'fb-ads',
    'tl17.html': 'tl17',
    'tools.html': 'tools',
    'luyen-tap.html': 'luyen-tap',
    'submission.html': 'kt41'
  };

  document.documentElement.style.visibility = 'hidden';

  function redirectToLogin() {
    const target = location.pathname.split('/').pop() + location.search + location.hash;
    location.replace(`index.html?next=${encodeURIComponent(target)}`);
  }

  async function checkAccess() {
    const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
    if (sessionError || !session) {
      if (sessionError) console.error('[ACCESS] getSession failed:', sessionError);
      redirectToLogin();
      return;
    }

    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('id, username, role, status')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile ||
        String(profile.status || '').trim().toLowerCase() !== 'active' ||
        !['member', 'mod', 'admin'].includes(String(profile.role || '').trim().toLowerCase())) {
      if (profileError) console.error('[ACCESS] Profile lookup failed:', profileError);
      await window.supabaseClient.auth.signOut();
      redirectToLogin();
      return;
    }

    window.currentUser = session.user;
    window.currentProfile = {
      ...profile,
      role: String(profile.role).trim().toLowerCase(),
      status: String(profile.status).trim().toLowerCase()
    };

    const filename = location.pathname.split('/').pop();
    if (filename === 'submission.html' && !['mod', 'admin'].includes(window.currentProfile.role)) {
      location.replace('index.html');
      return;
    }
    const page = pageNames[filename];
    if (filename !== 'submission.html' && page &&
        ['mod', 'admin'].includes(window.currentProfile.role)) {
      const existing = document.getElementById('open-submission-btn');
      if (existing) {
        existing.href = `submission.html?page=${encodeURIComponent(page)}`;
        existing.style.display = 'inline';
      } else {
        const topbar = document.querySelector('.topbar > div:last-child');
        if (topbar) {
          const link = document.createElement('a');
          link.id = 'open-submission-btn';
          link.href = `submission.html?page=${encodeURIComponent(page)}`;
          link.textContent = '+ GỬI BÀI';
          link.style.cssText = 'padding:7px 10px;background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.45);color:#c4b5fd;text-decoration:none;font-family:"Share Tech Mono",monospace;font-size:10px;letter-spacing:.06em;';
          topbar.prepend(link);
        }
      }
    }

    document.documentElement.style.visibility = '';
    window.dispatchEvent(new Event('access-granted'));
  }

  function createClient() {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true
      }
    });
    checkAccess().catch(error => {
      console.error('[ACCESS] Could not verify access:', error);
      redirectToLogin();
    });
  }

  if (window.supabase) {
    createClient();
    return;
  }

  const sdk = document.createElement('script');
  sdk.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  sdk.onload = createClient;
  sdk.onerror = () => {
    console.error('[ACCESS] Failed to load Supabase SDK.');
    redirectToLogin();
  };
  document.head.append(sdk);
})();

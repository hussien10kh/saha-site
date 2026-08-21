/* ===== Tourism header: auth-aware =====
   يشتغل بعد ما يتحمّل helpers.js (لأنه بستعمل authGetUser).
   لو المستخدم مسجّل: يضيف اسمه + زر خروج مكان الأفاتار.
   لو مو مسجّل: يحوّل رابط الأفاتار للـlogin بدل profile الفاضية.
*/
(function tourismHeaderAuth() {
  function run() {
    if (typeof authGetUser !== 'function') return;
    const right = document.querySelector('.t-header-right');
    if (!right) return;
    const user = authGetUser();
    const avatar = right.querySelector('.t-avatar');

    if (user) {
      // مسجّل — استبدل الأفاتار بشِپ اسم + زر خروج
      const name = user.name || (user.email || '').split('@')[0] || 'حسابي';
      const shortName = name.length > 12 ? name.slice(0, 12) + '…' : name;
      const wrap = document.createElement('div');
      wrap.className = 't-auth-chip';
      wrap.style.cssText = 'display:flex;gap:6px;align-items:center;';
      wrap.innerHTML = `
        <a href="profile.html" title="${name}" aria-label="${name} — الملف الشخصي"
           style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;
                  background:var(--t-primary-light,#e0e7ff);color:var(--t-primary-dark,#0f5c2a);
                  font-size:12.5px;font-weight:700;text-decoration:none;">
          👤 ${shortName}
        </a>
        <button type="button" id="tLogoutBtn" aria-label="تسجيل الخروج"
          style="border:1px solid #d93025;background:transparent;color:#d93025;
                 padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
          خروج
        </button>
      `;
      if (avatar) avatar.replaceWith(wrap);
      else right.appendChild(wrap);

      document.getElementById('tLogoutBtn').addEventListener('click', async () => {
        // خروج فعلي عبر Supabase لو محمّل، وإلا امسح token من localStorage
        try {
          if (typeof sb !== 'undefined' && sb.auth) await sb.auth.signOut();
          else {
            Object.keys(localStorage).forEach(k => {
              if (k.indexOf('sb-') === 0 || k.indexOf('supabase.auth') === 0) localStorage.removeItem(k);
            });
          }
        } catch (e) {}
        location.reload();
      });
    } else {
      // مو مسجّل — الأفاتار يودّي للـlogin مع redirect للصفحة الحالية
      if (avatar) {
        avatar.setAttribute('href', '../login.html?redirect=' + encodeURIComponent(location.pathname + location.search));
        avatar.setAttribute('aria-label', 'تسجيل الدخول');
        avatar.setAttribute('title', 'تسجيل الدخول');
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

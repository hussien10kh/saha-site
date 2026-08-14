// ===== ودجت مراجعات موحّد =====
// يُدرج نموذج + قائمة مراجعات لأي هدف (venue/coach/academy).
// الاستخدام:
//   ReviewWidget.mount(document.getElementById('reviewsSlot'), 'venue', venueId);
const ReviewWidget = (() => {
  function starsInput(name) {
    return `<div class="review-stars-input">${[5,4,3,2,1].map(n =>
      `<label><input type="radio" name="${name}" value="${n}"${n===5?' checked':''}> ${'★'.repeat(n)}</label>`
    ).join("")}</div>`;
  }

  function reviewItem(r) {
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    const when = new Date(r.created_at).toLocaleDateString("ar");
    return `<div class="review-item">
      <div class="review-item-head"><strong>${r.name}</strong><span class="review-stars">${stars}</span><span class="muted" style="font-size:.75em;">${when}</span></div>
      ${r.text ? `<p>${r.text}</p>` : ""}
    </div>`;
  }

  async function mount(container, targetType, targetId) {
    container.innerHTML = `
      <div class="review-widget">
        <h4>تقييمات المستخدمين</h4>
        <div id="rwList">جاري التحميل...</div>
        <form id="rwForm" class="review-form" style="margin-top:1em;padding-top:1em;border-top:1px solid var(--line, #e5e7eb);">
          <label style="font-weight:700;display:block;margin-bottom:.4em;">اكتب مراجعتك</label>
          ${starsInput('rwRating')}
          <textarea id="rwText" placeholder="اكتب تجربتك (اختياري)" rows="3" style="width:100%;margin-top:.5em;padding:.6em;border:1px solid var(--line,#e5e7eb);border-radius:8px;font-family:inherit;"></textarea>
          <button type="submit" class="btn btn-primary" style="margin-top:.6em;">إرسال المراجعة</button>
          <p id="rwHint" class="muted" style="font-size:.78em;margin-top:.4em;"></p>
        </form>
      </div>
    `;
    const listEl = container.querySelector("#rwList");
    const form = container.querySelector("#rwForm");
    const hint = container.querySelector("#rwHint");

    async function refresh() {
      try {
        const rows = await MalaabakAPI.reviews(targetType, targetId);
        listEl.innerHTML = rows.length
          ? rows.map(reviewItem).join("")
          : `<p class="muted" style="text-align:center;padding:1em 0;">لا مراجعات بعد. كن أول من يقيّم.</p>`;
      } catch (err) {
        listEl.innerHTML = `<p class="muted">تعذّر تحميل المراجعات: ${err.message}</p>`;
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rating = Number(new FormData(form).get("rwRating") || 5);
      const text = container.querySelector("#rwText").value.trim();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        hint.textContent = "لازم تسجّل دخول أول. عم نحوّلك...";
        setTimeout(() => { location.href = "login.html?redirect=" + encodeURIComponent(location.pathname + location.search); }, 1000);
        return;
      }
      const btn = form.querySelector("button");
      btn.disabled = true; btn.textContent = "جاري الإرسال...";
      try {
        // اجلب اسم المستخدم من profiles أو استعمل بريد
        const { data: profile } = await sb.from("profiles").select("name").eq("id", user.id).single();
        const name = profile?.name || user.email?.split("@")[0] || "زائر";
        await MalaabakAPI.addReview(targetType, targetId, { name, rating, text });
        form.reset();
        hint.textContent = "✓ شكراً — تمت إضافة مراجعتك.";
        btn.disabled = false; btn.textContent = "إرسال المراجعة";
        refresh();
      } catch (err) {
        hint.textContent = "تعذّر الإرسال: " + err.message;
        btn.disabled = false; btn.textContent = "إرسال المراجعة";
      }
    });

    refresh();
  }

  return { mount };
})();

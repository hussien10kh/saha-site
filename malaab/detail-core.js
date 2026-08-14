// ===== أدوات مشتركة لصفحات التفاصيل (ملعب / مدرب / أكاديمية / موهبة) =====
// نفس مبدأ list-page.js: كل شي مشترك بمكان واحد بدل ما ينتكرر بأربع صفحات.
// لازم ينحمّل بعد data.js.

const DetailCore = {
  // ---------- المسافة الحقيقية ----------
  // Haversine على إحداثيات فعلية - "الأقرب" لازم تكون أقرب فعلاً مو ترتيب عشوائي
  distanceKm(a, b) {
    if (a.lat == null || b.lat == null) return Infinity;
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  },

  fmtDistance(km) {
    if (!isFinite(km)) return "";
    return km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(km < 10 ? 1 : 0)} كم`;
  },

  // بترجّع أقرب N عناصر مرتّبة تصاعدياً، مع حقل km مضاف
  nearest(item, list, n = 4) {
    return list
      .filter((x) => x.id !== item.id)
      .map((x) => ({ ...x, km: this.distanceKm(item, x) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, n);
  },

  stars(n) {
    const r = Math.round(n);
    return "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));
  },

  // ---------- عناصر "أخرى" بدون إحداثيات ----------
  // المباريات/التمارين/الفعاليات ما إلها lat/lng، فبدل المسافة منرتّب: نفس المحافظة أول،
  // وضمنها نفس النوع/الرياضة، عشان "مباريات أخرى" تكون فعلاً ذات صلة مو عشوائية.
  related(item, list, n = 4) {
    const kind = item.sport || item.type;
    return list
      .filter((x) => x.id !== item.id)
      .map((x) => ({
        ...x,
        _score: (x.governorate === item.governorate ? 0 : 2) + ((x.sport || x.type) === kind ? 0 : 1),
      }))
      .sort((a, b) => a._score - b._score)
      .slice(0, n);
  },

  // إيموجي حسب الرياضة/النوع - للعناصر المُضافة من الفورمات (ما بيرفعوا صورة فعلية)
  sportEmoji(sport) {
    const map = {
      "كرة قدم": "⚽", "كرة صالات": "🥅", "كرة سلة": "🏀", "تنس": "🎾",
      "تنس طاولة": "🏓", "كرة طائرة": "🏐", "سباحة": "🏊", "جيم": "🏋️",
      "رياضات قتالية": "🥊", "لياقة بدنية": "💪", "يوغا": "🧘",
    };
    return map[sport] || "⚽";
  },

  // ---------- قراءة العنصر من الرابط ----------
  // بترجّع العنصر المطلوب حسب ?id= أو أول عنصر كبديل (ما منترك الصفحة فاضية)
  fromQuery(list) {
    const id = Number(new URLSearchParams(location.search).get("id"));
    return list.find((x) => x.id === id) || list[0] || null;
  },

  notFoundHTML(backHref, backLabel) {
    return `
      <div class="search-empty show">
        <div class="search-empty-icon">🔍</div>
        <p class="search-empty-title">ما لقينا هالصفحة</p>
        <p class="search-empty-hint">يمكن الرابط قديم أو العنصر انحذف.</p>
        <a href="${backHref}" class="btn btn-outline">${backLabel}</a>
      </div>`;
  },

  breadcrumbHTML(links) {
    return `<p class="detail-breadcrumb">${links.map((l, i) =>
      (i ? "<span>›</span>" : "") + (l.href ? `<a href="${l.href}">${l.label}</a>` : l.label)
    ).join("")}</p>`;
  },

  specsHTML(specs) {
    return `<div class="detail-specs">${specs.map((s) => `
      <div class="detail-spec">
        <div class="detail-spec-icon">${s.icon}</div>
        <div class="detail-spec-label">${s.label}</div>
        <div class="detail-spec-value">${s.value}</div>
      </div>`).join("")}</div>`;
  },

  // ---------- التقييمات ----------
  // التوزيع محسوب من المراجعات الفعلية مو أرقام ثابتة
  reviewsHTML(reviews, avgRating, totalCount) {
    const list = reviews || [];
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach((r) => { counts[r.rating] = (counts[r.rating] || 0) + 1; });
    const total = list.length || 1;
    const bars = [5, 4, 3, 2, 1].map((star) => {
      const c = counts[star];
      return `<div class="review-bar-row">
        <span>${star} ★</span>
        <span class="review-bar"><span class="review-bar-fill" style="width:${Math.round((c / total) * 100)}%"></span></span>
        <span>${c}</span>
      </div>`;
    }).join("");

    const cards = list.map((r) => `
      <div class="review-card">
        <div class="review-card-head">
          <span class="review-card-name">${r.name}</span>
          <span class="review-card-when">${r.when}</span>
        </div>
        <div class="review-card-stars">${this.stars(r.rating)}</div>
        <p class="review-card-text">${r.text}</p>
      </div>`).join("");

    return `
      <div class="detail-panel">
        <h3>التقييمات (${totalCount != null ? totalCount : list.length})</h3>
        <div class="review-summary">
          <div class="review-score">
            <div class="review-score-num">${Number(avgRating).toFixed(1)}</div>
            <div class="review-card-stars">${this.stars(avgRating)}</div>
            <div class="review-score-meta">${totalCount != null ? totalCount : list.length} تقييم</div>
          </div>
          <div class="review-bars">${bars}</div>
        </div>
        ${cards || '<p class="muted" style="font-size:0.8em;">ما في تقييمات بعد.</p>'}
      </div>`;
  },

  // ---------- الموقع ----------
  mapPanelHTML(address) {
    return `
      <div class="detail-panel">
        <h3>الموقع</h3>
        <div class="detail-map">🗺️</div>
        <p class="muted" style="font-size:0.78em;">${address}</p>
        <a href="#" class="btn btn-outline" style="display:block;text-align:center;">الاتجاهات</a>
      </div>`;
  },

  // ---------- زر المشاركة ----------
  wireShare(btn, title) {
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const url = location.href;
      try {
        if (navigator.share) await navigator.share({ title, url });
        else { await navigator.clipboard.writeText(url); alert("تم نسخ الرابط"); }
      } catch (e) { /* المستخدم لغى المشاركة */ }
    });
  },

  // ---------- فترات الحجز ----------
  // "محجوز" ثابت حسب رقم العنصر عشان العرض ما يتغيّر عشوائياً بكل تحديث
  slotsHTML(seed, hours) {
    const HOURS = hours || ["10:00 - 9:00", "9:00 - 8:00", "8:00 - 7:00", "7:00 - 6:00", "6:00 - 5:00", "5:00 - 4:00"];
    return HOURS.map((h, i) => {
      const booked = (i + seed) % 3 === 0;
      return `<button type="button" class="slot${booked ? " booked" : ""}"${booked ? " disabled" : ""} data-slot="${h}">
        <span class="slot-time">${h}</span>
        <span class="slot-state">${booked ? "محجوز" : "متاح"}</span>
      </button>`;
    }).join("");
  },

  wireSlots(root, onPick) {
    const grid = root.querySelector(".slot-grid");
    if (!grid) return;
    grid.addEventListener("click", (e) => {
      const s = e.target.closest(".slot");
      if (!s || s.classList.contains("booked")) return;
      grid.querySelectorAll(".slot").forEach((x) => x.classList.remove("selected"));
      s.classList.add("selected");
      if (onPick) onPick(s.dataset.slot);
    });
  },
};

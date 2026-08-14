// ===== محرك صفحات القوائم المشترك =====
// قبل هالملف كان منطق الشبكة (ترقيم + حساب الصفوف + سهم فيض الوسوم + حالة "لا نتائج" + بحث الهيرو)
// منسوخ حرفياً بين venues.html و matches.html (~250 سطر لكل صفحة). أي إصلاح كان لازم يتكرر بكل نسخة.
// هلق أي صفحة قائمة جديدة = إعدادات فقط.
//
// لازم ينحمّل بعد data.js (بيستخدم MalaabakSearch و SEARCH_EMPTY_COPY).

const ListPage = {
  create(config) {
    const $ = (id) => document.getElementById(id);
    const ids = config.ids;
    const grid = $(ids.grid);
    const noResults = $(ids.noResults);
    const hintEl = $(ids.hint);
    const clearSearchBtn = $(ids.clearSearch);
    const countLabel = $(ids.count);
    const pagination = $(ids.pagination);
    if (!grid) return null;

    const cardSelector = config.cardSelector || ".venue-card";
    const tagsSelector = config.tagsSelector || ".venue-card-amenities";

    // عناصر الهيرو (اختيارية - مو كل صفحة إلها صندوق بحث)
    const heroCfg = config.hero || {};
    const freeSearchInput = $("freeSearch");
    const searchBtn = $("searchBtn");
    const filterSportSelect = $("filterSport");
    const govSelect = $("filterGovernorate");
    const cityInput = $("filterCity");

    let PAGE_SIZE = 6; // تخمين أولي، بينضبط فوراً بـrecalcPageSize بعد أول رندر حقيقي
    let currentPage = 1;
    let heroTerm = "";
    let heroSport = "";

    // ---------- عدد البطاقات بالصفحة ----------
    // الأعمدة مقاسة فعلياً من الـDOM (auto-fit بيحددها حسب العرض مو حسب عدد العناصر)،
    // والصفوف ثابتة حسب عدد الأعمدة عشان الصف الأخير يضل ممتلئ دايماً (بدون بطاقة وحيدة لحالها)
    function recalcPageSize() {
      const cards = [...grid.querySelectorAll(cardSelector)];
      if (!cards.length) return false;
      const tops = [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top)))];
      const columns = cards.filter((c) => Math.round(c.getBoundingClientRect().top) === tops[0]).length;
      const rows = columns === 1 ? 4 : 3;
      const desired = columns * rows;
      if (desired !== PAGE_SIZE) { PAGE_SIZE = desired; return true; }
      return false;
    }

    // ---------- الترقيم ----------
    function renderPagination(totalItems) {
      const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;
      pagination.innerHTML = "";
      if (totalPages <= 1) return;

      const mk = (text, disabled, onClick, active) => {
        const b = document.createElement("button");
        b.textContent = text;
        b.disabled = !!disabled;
        if (active) b.classList.add("active");
        b.addEventListener("click", onClick);
        pagination.appendChild(b);
      };

      mk("→", currentPage === 1, () => { currentPage--; render(); });
      for (let p = 1; p <= totalPages; p++) {
        mk(p, false, () => { currentPage = p; render(); }, p === currentPage);
      }
      mk("←", currentPage === totalPages, () => { currentPage++; render(); });
    }

    // ---------- سهم فيض الوسوم ----------
    // الوسوم بصف واحد؛ يلي ما بيضبط بينخبى ورا سهم » بيفتح قائمة صغيرة فيها المخفي
    function setupTagOverflow() {
      grid.querySelectorAll(tagsSelector).forEach((container) => {
        const tags = [...container.querySelectorAll(":scope > .tag")];
        const toggle = container.querySelector(".venue-card-amenities-toggle");
        const panel = container.querySelector(".venue-card-amenities-panel");
        if (!toggle || !panel) return;

        tags.forEach((t) => { t.style.display = ""; });
        toggle.classList.remove("show", "open");
        toggle.textContent = "»";
        panel.classList.remove("open");
        panel.innerHTML = "";
        if (!tags.length) return;

        const gap = parseFloat(getComputedStyle(container).gap) || 6;
        const containerWidth = container.clientWidth;
        const totalWidth = tags.reduce((s, t) => s + t.offsetWidth, 0) + gap * (tags.length - 1);
        if (totalWidth <= containerWidth) return;

        // لازم نحجز مساحة السهم قبل ما نوزّع الوسوم، وإلا آخر وسم بيتداخل معه
        const toggleWidth = toggle.offsetWidth || 24;
        const available = containerWidth - toggleWidth - gap;
        let used = 0;
        const hidden = [];
        tags.forEach((tag, i) => {
          const extra = i === 0 ? tag.offsetWidth : tag.offsetWidth + gap;
          if (used + extra <= available) used += extra;
          else { tag.style.display = "none"; hidden.push(tag.textContent); }
        });

        if (hidden.length) {
          toggle.classList.add("show");
          panel.innerHTML = hidden.map((a) => `<span class="tag">${a}</span>`).join("");
        }
      });
    }

    function closeAllPanels() {
      document.querySelectorAll(".venue-card-amenities-panel.open").forEach((p) => p.classList.remove("open"));
      document.querySelectorAll(".venue-card-amenities-toggle.open").forEach((t) => {
        t.classList.remove("open"); t.textContent = "»";
      });
    }

    grid.addEventListener("click", (e) => {
      const toggle = e.target.closest(".venue-card-amenities-toggle");
      if (!toggle) return;
      // البطاقة كلها <a> فلازم نمنع التنقل، وnمنع الوصول لـdocument عشان ما تنسكر فوراً
      e.preventDefault();
      e.stopPropagation();
      const panel = toggle.closest(tagsSelector).querySelector(".venue-card-amenities-panel");
      const willOpen = !panel.classList.contains("open");
      closeAllPanels();
      if (willOpen) {
        // position:fixed محسوبة بالجافاسكربت - البطاقة عندها overflow:hidden (لقص الصورة)
        // وهاد كان بيقص أي عنصر absolute جواها فما كانت القائمة تبين أبداً
        const r = toggle.getBoundingClientRect();
        panel.style.top = `${r.bottom + 4}px`;
        panel.style.left = `${Math.max(4, r.right - 140)}px`;
        panel.classList.add("open");
        toggle.classList.add("open");
        toggle.textContent = "«";
      }
    });
    document.addEventListener("click", closeAllPanels);
    window.addEventListener("scroll", closeAllPanels, true);

    // ---------- الفلترة ----------
    function heroActive() {
      return !!heroTerm || !!heroSport
        || !!(govSelect && govSelect.value)
        || !!(cityInput && cityInput.value.trim());
    }

    function anyFilterActive() {
      return (config.isFilterActive ? config.isFilterActive() : false) || heroActive();
    }

    function getFiltered() {
      const heroGov = govSelect ? govSelect.value : "";
      const heroCity = cityInput ? cityInput.value.trim() : "";
      // sportField: null صراحةً = الصفحة بتتعامل مع رياضة الهيرو بنفسها (مثلاً الأكاديمية بتقدّم
      // مصفوفة رياضات فما ينفع تطابق بحقل واحد). بدون هالتمييز الـfallback لـ"sport" كان بيفلتر كل شي.
      const sportField = heroCfg.sportField === null ? null : (heroCfg.sportField || "sport");
      const govField = heroCfg.govField || "governorate";
      const cityFields = heroCfg.cityFields || ["city"];

      let list = config.data().filter((item) => {
        if (config.filter && !config.filter(item)) return false;
        // رياضة الهيرو متفحّصة مستقلة عن فلتر السايد بار - قائمة السايد بار مبنية من البيانات
        // بينما الهيرو فيها خيارات ما إلها نتائج، فبدون هالفحص بتطلع كل النتائج بدل ولا وحدة
        if (sportField && heroSport && item[sportField] !== heroSport) return false;
        if (heroGov && item[govField] !== heroGov) return false;
        if (heroCity && !cityFields.some((f) => String(item[f] || "").includes(heroCity))) return false;
        if (config.haystack && !MalaabakSearch.matches(config.haystack(item), heroTerm)) return false;
        return true;
      });

      return config.sort ? config.sort(list) : list;
    }

    // ---------- الرندر ----------
    function render() {
      const filtered = getFiltered();
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = filtered.slice(start, start + PAGE_SIZE);

      grid.innerHTML = pageItems.map(config.cardHTML).join("");

      const empty = filtered.length === 0;
      if (noResults) {
        noResults.classList.toggle("show", empty);
        if (empty && hintEl) {
          hintEl.textContent = heroTerm
            ? SEARCH_EMPTY_COPY.hintWithTerm(heroTerm)
            : SEARCH_EMPTY_COPY.hintFiltersOnly;
        }
        if (empty && clearSearchBtn) clearSearchBtn.style.display = heroActive() ? "" : "none";
      }

      if (countLabel) {
        countLabel.textContent = (!anyFilterActive() || empty) ? "" : config.countText(filtered.length);
      }

      renderPagination(filtered.length);
      setupTagOverflow();

      // الأعمدة/الارتفاع ثابتين بغض النظر عن عدد العناصر، فما في حلقة لا نهائية
      if (recalcPageSize()) render();
    }

    function resetAndRender() { currentPage = 1; render(); }

    // ---------- بحث الهيرو ----------
    function runHeroSearch() {
      if (freeSearchInput) heroTerm = (freeSearchInput.value || "").trim();
      if (filterSportSelect) heroSport = filterSportSelect.value;
      const sidebarSport = heroCfg.sidebarSport && heroCfg.sidebarSport();
      if (sidebarSport) {
        sidebarSport.value = [...sidebarSport.options].some((o) => o.value === heroSport) ? heroSport : "";
      }
      resetAndRender();
      const main = document.querySelector(".venues-main");
      if (main) main.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function clearHero({ rerender = true, focus = true } = {}) {
      if (freeSearchInput) freeSearchInput.value = "";
      if (filterSportSelect) filterSportSelect.value = "";
      if (cityInput) cityInput.value = "";
      if (govSelect) govSelect.value = "";
      if (config.refreshCityOptions) config.refreshCityOptions();
      heroTerm = "";
      heroSport = "";
      const sidebarSport = heroCfg.sidebarSport && heroCfg.sidebarSport();
      if (sidebarSport) sidebarSport.value = "";
      if (rerender) resetAndRender();
      if (focus && freeSearchInput) freeSearchInput.focus();
    }

    // ---------- الربط ----------
    if (searchBtn) searchBtn.addEventListener("click", runHeroSearch);
    if (freeSearchInput) {
      freeSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); runHeroSearch(); }
      });
    }
    if (filterSportSelect) filterSportSelect.addEventListener("change", runHeroSearch);
    // govSelect عندها listener موجود (refreshCityOptions) - هاد إضافة عليه مو استبدال
    if (govSelect) govSelect.addEventListener("change", runHeroSearch);
    if (cityInput) cityInput.addEventListener("change", runHeroSearch);
    if (clearSearchBtn) clearSearchBtn.addEventListener("click", () => clearHero());

    (config.watch || []).forEach((el) => {
      if (el) el.addEventListener("change", resetAndRender);
    });

    if (config.clearBtn) {
      config.clearBtn.addEventListener("click", () => {
        if (config.onClearFilters) config.onClearFilters();
        clearHero({ rerender: false, focus: false }); // مسح الفلاتر لازم يمسح بحث الهيرو كمان
        resetAndRender();
      });
    }

    function debounce(fn, delay) {
      let t;
      return () => { clearTimeout(t); t = setTimeout(fn, delay); };
    }
    window.addEventListener("resize", debounce(render, 150));

    // دخول من رابط خارجي: ?q= &sport= &gov= &city=
    if (config.readQueryParams) {
      const p = new URLSearchParams(location.search);
      if ([...p.keys()].length) {
        if (p.get("q") && freeSearchInput) freeSearchInput.value = p.get("q");
        if (p.get("sport") && filterSportSelect) filterSportSelect.value = p.get("sport");
        if (p.get("gov") && govSelect) {
          govSelect.value = p.get("gov");
          if (config.refreshCityOptions) config.refreshCityOptions();
        }
        if (p.get("city") && cityInput) cityInput.value = p.get("city");
        heroTerm = freeSearchInput ? (freeSearchInput.value || "").trim() : "";
        heroSport = filterSportSelect ? filterSportSelect.value : "";
        const sidebarSport = heroCfg.sidebarSport && heroCfg.sidebarSport();
        if (sidebarSport) {
          sidebarSport.value = [...sidebarSport.options].some((o) => o.value === heroSport) ? heroSport : "";
        }
      }
    }

    render();
    // خط Cairo بيتحمّل async - لو خلص بعد أول رندر، ارتفاع البطاقة بيتغيّر وبيخرب قياس الصفوف
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);

    return { render, resetAndRender, clearHero, setPageSize: (n) => { PAGE_SIZE = n; } };
  },
};

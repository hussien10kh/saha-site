/* Shared tourism category page runtime.
   Loads approved Supabase places through helpers.js, with local fallback. */
(async function () {
  var config = window.TOURISM_CATEGORY_PAGE || {};
  var category = config.category || 'landmark';
  var defaultPrice = config.defaultPrice || '$';
  var defaultTag = config.defaultTag || config.label || 'مكان سياحي';
  var center = config.center || [34.8, 37.0];
  var zoom = config.zoom || 7;

  var all = typeof tourismGetPlaces === 'function' ? await tourismGetPlaces() : tourismStaticPlaces();
  var PLACES = all
    .filter(function (p) { return p.category === category; })
    .map(function (p) {
      return Object.assign({}, p, {
        loc: [p.area, p.city].filter(Boolean).join('، '),
        price: p.price || defaultPrice,
        tag: p.tag || defaultTag
      });
    });

  var PAGE_SIZE = 4;
  var currentPage = 1;
  var sortBy = 'rating-desc';
  var priceFilter = '';
  var vibeFilter = '';
  var cityFilter = '';
  var areaFilter = '';

  var heartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.7-10-9.3C.4 8 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.2 4 3.6 7.7C16.5 16.3 12 21 12 21Z"/></svg>';
  var shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';

  var list = document.getElementById('cList');
  var pagination = document.getElementById('cPagination');
  var sortSelect = document.getElementById('cSort');
  var priceSelect = document.getElementById('cPriceFilter');
  var vibeSelect = document.getElementById('cVibeFilter');
  var citySelect = document.getElementById('cCityFilter');
  var areaSelect = document.getElementById('cAreaFilter');

  function uniqueValues(key, scoped) {
    var values = [];
    (scoped || PLACES).forEach(function (p) {
      if (p[key] && values.indexOf(p[key]) === -1) values.push(p[key]);
    });
    return values;
  }

  function setOptions(select, first, values) {
    if (!select) return;
    select.innerHTML = '<option value="">' + first + '</option>' +
      values.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
  }

  setOptions(vibeSelect, 'الجو العام: الكل', uniqueValues('tag'));
  setOptions(citySelect, 'المدينة: الكل', uniqueValues('city'));

  function refreshAreaOptions() {
    var scoped = cityFilter ? PLACES.filter(function (p) { return p.city === cityFilter; }) : PLACES;
    var areas = uniqueValues('area', scoped);
    setOptions(areaSelect, 'المنطقة: الكل', areas);
    if (areas.indexOf(areaFilter) === -1) areaFilter = '';
    if (areaSelect) areaSelect.value = areaFilter;
  }
  refreshAreaOptions();

  function priceWeight(p) { return p === '$' ? 1 : (p === '$$' ? 2 : 3); }
  function imgSrc(p) {
    if (!p.image) return 'images/header/hero-umayyad.jpg';
    return String(p.image).indexOf('http') === 0 ? p.image : 'images/' + p.image;
  }

  function getFiltered() {
    return PLACES.filter(function (p) {
      if (priceFilter && p.price !== priceFilter) return false;
      if (vibeFilter && p.tag !== vibeFilter) return false;
      if (cityFilter && p.city !== cityFilter) return false;
      if (areaFilter && p.area !== areaFilter) return false;
      return true;
    }).sort(function (a, b) {
      if (sortBy === 'price-asc') return priceWeight(a.price) - priceWeight(b.price);
      if (sortBy === 'price-desc') return priceWeight(b.price) - priceWeight(a.price);
      if (sortBy === 'rating-desc') {
        var ra = placesAverageRating(a.id), rb = placesAverageRating(b.id);
        return (rb || 0) - (ra || 0);
      }
      return 0;
    });
  }

  function cardHtml(p) {
    return '<a class="c-card" href="place.html?id=' + p.id + '">' +
      '<div class="c-card-media"><img src="' + imgSrc(p) + '" alt="' + p.name + '" loading="lazy"></div>' +
      '<div class="c-card-body">' +
        '<div class="c-card-top"><h3>' + p.name + '</h3>' +
          '<div class="c-card-actions">' +
            '<button type="button" class="fav-btn" data-id="' + p.id + '" aria-label="مفضلة">' + heartIcon + '</button>' +
            '<button type="button" aria-label="مشاركة">' + shareIcon + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="c-card-loc">' + p.loc + '</div>' +
        '<div class="c-card-meta"><span class="c-card-price">' + p.price + '</span>' +
          '<span class="c-card-tag">' + p.tag + '</span></div>' +
      '</div>' +
    '</a>';
  }

  function renderList(items) {
    if (!items.length) {
      list.innerHTML = '<div class="c-empty">ما في نتائج مطابقة للفلترة الحالية</div>';
      return;
    }
    var start = (currentPage - 1) * PAGE_SIZE;
    list.innerHTML = items.slice(start, start + PAGE_SIZE).map(cardHtml).join('');
    favoritesWireButtons(list);
  }

  function renderPagination(total) {
    var pageCount = Math.ceil(total / PAGE_SIZE);
    if (pageCount <= 1) { pagination.innerHTML = ''; return; }
    var html = '<button class="c-page-btn" id="cPrev"' + (currentPage === 1 ? ' disabled' : '') + '>السابق</button>';
    for (var p = 1; p <= pageCount; p++) {
      html += '<button class="c-page-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }
    html += '<button class="c-page-btn" id="cNext"' + (currentPage === pageCount ? ' disabled' : '') + '>التالي</button>';
    pagination.innerHTML = html;
    var prev = document.getElementById('cPrev');
    var next = document.getElementById('cNext');
    if (prev) prev.addEventListener('click', function () { goToPage(currentPage - 1); });
    if (next) next.addEventListener('click', function () { goToPage(currentPage + 1); });
    pagination.querySelectorAll('[data-page]').forEach(function (b) {
      b.addEventListener('click', function () { goToPage(+b.dataset.page); });
    });
  }

  function refresh() {
    var items = getFiltered();
    renderList(items);
    renderPagination(items.length);
  }

  /* Meta Pixel — فلترة بادرها المستخدم. مو جوّا refresh() لأنها بتنستدعى
     بالرندر الأولي وعند تنقّل الصفحات كمان.
     citySelect هوّي أخشن فلتر جغرافي بهالصفحة (وقيمه محافظات فعلياً بالبيانات
     الحالية)، فمنعتمده كـgovernorate للتقارير. */
  function trackFilterSearch() {
    window.MetaPixel?.search({
      category: config.label || category,
      city: cityFilter, governorate: cityFilter,
      section: 'tourism', type: 'place',
    });
  }

  function goToPage(p) {
    currentPage = p;
    refresh();
    window.scrollTo({ top: list.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }

  if (sortSelect) sortSelect.addEventListener('change', function () { sortBy = sortSelect.value; currentPage = 1; refresh(); trackFilterSearch(); });
  if (priceSelect) priceSelect.addEventListener('change', function () { priceFilter = priceSelect.value; currentPage = 1; refresh(); trackFilterSearch(); });
  if (vibeSelect) vibeSelect.addEventListener('change', function () { vibeFilter = vibeSelect.value; currentPage = 1; refresh(); trackFilterSearch(); });
  if (citySelect) citySelect.addEventListener('change', function () {
    cityFilter = citySelect.value;
    areaFilter = '';
    refreshAreaOptions();
    currentPage = 1;
    refresh();
    trackFilterSearch();
  });
  if (areaSelect) areaSelect.addEventListener('change', function () { areaFilter = areaSelect.value; currentPage = 1; refresh(); trackFilterSearch(); });

  refresh();

  if (typeof L !== 'undefined') {
    var map = L.map('cMap', { scrollWheelZoom: false }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18
    }).addTo(map);
    PLACES.forEach(function (p) {
      if (!p.lat || !p.lng) return;
      L.marker([p.lat, p.lng]).addTo(map).bindPopup('<b>' + p.name + '</b><br><a href="https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener" style="color:#0d9488;font-weight:700;text-decoration:underline;">🧭 افتح الاتجاهات</a>');
    });
  }
})();

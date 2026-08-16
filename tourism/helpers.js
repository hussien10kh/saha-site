/* =========================================================
   ساحة سياحة — الدوال المساعدة (helpers)
   يعرّف كل الدوال التي تنادي عليها صفحات السياحة والتي لم تكن معرّفة
   في أي مكان (المصدر أصلاً كان معاينة تصميم فقط، بدون منطق شغّال).
   يجب تحميله في كل صفحة سياحية قبل السكربتات التي تستخدمه.
   ========================================================= */

/* ============= الأماكن (Places) ============= */
function placesGetById(id) {
  if (typeof PLACES_DATA === 'undefined') return null;
  return PLACES_DATA.find(function (p) { return p.id === id; }) || null;
}

function tourismLocalImage(src) {
  if (!src) return 'header/hero-umayyad.png';
  return String(src).indexOf('http') === 0 ? src : src.replace(/^images\//, '');
}

function tourismNormalizeCategory(category) {
  if (category === 'restaurant') return 'food';
  return category || 'landmark';
}

function tourismRowToPlace(row) {
  var images = Array.isArray(row.images) ? row.images : [];
  var image = images[0] || row.image || 'header/hero-umayyad.png';
  return {
    id: row.id,
    name: row.name || 'مكان سياحي',
    category: tourismNormalizeCategory(row.category),
    city: row.city || row.region || 'سوريا',
    area: row.address || row.city || row.region || 'سوريا',
    lat: Number(row.lat || row.latitude) || 34.8,
    lng: Number(row.lng || row.longitude) || 37.0,
    image: tourismLocalImage(image),
    desc: row.description || row.desc || '',
    videoUrl: row.video_url || row.videoUrl || '',
    status: row.status || 'approved',
    addedBy: row.added_by || null,
    createdAt: row.created_at || null
  };
}

function tourismStaticPlaces() {
  return (typeof PLACES_DATA !== 'undefined' ? PLACES_DATA : []).map(function (p) {
    return Object.assign({}, p, {
      category: tourismNormalizeCategory(p.category),
      image: tourismLocalImage(p.image)
    });
  });
}

async function tourismGetPlaces() {
  var local = tourismStaticPlaces();
  if (typeof sb === 'undefined') return local;
  try {
    var res = await sb.from('tourism_places')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    var remote = (res.data || []).map(tourismRowToPlace);
    var byId = {};
    local.forEach(function (p) { byId[p.id] = p; });
    remote.forEach(function (p) { byId[p.id] = p; });
    return Object.keys(byId).map(function (id) { return byId[id]; });
  } catch (e) {
    console.error('tourismGetPlaces failed:', e);
    return local;
  }
}

async function tourismGetPlaceById(id) {
  if (!id) return null;
  var local = placesGetById(id);
  if (typeof sb !== 'undefined') {
    try {
      var res = await sb.from('tourism_places')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .maybeSingle();
      if (res.error) throw res.error;
      if (res.data) return tourismRowToPlace(res.data);
    } catch (e) {
      console.error('tourismGetPlaceById failed:', e);
    }
  }
  return local ? tourismRowToPlace(local) : null;
}

function placesDistanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return Infinity;
  var R = 6371;
  var toRad = function (d) { return (d * Math.PI) / 180; };
  var dLat = toRad(b.lat - a.lat);
  var dLng = toRad(b.lng - a.lng);
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function placesNearby(place, n) {
  if (typeof PLACES_DATA === 'undefined' || !place) return [];
  n = n || 4;
  return PLACES_DATA
    .filter(function (p) { return p.id !== place.id; })
    .map(function (p) { return { place: p, km: placesDistanceKm(place, p) }; })
    .sort(function (a, b) { return a.km - b.km; })
    .slice(0, n);
}

/* ============= المراجعات (Reviews) =============
   مخزّنة في localStorage تحت مفتاح موحّد بلا اعتماد على باكند.
   لكل مراجعة: { placeId, name, email, rating, text, when } */
var REVIEWS_KEY = 'saaha_tourism_reviews';

function _loadReviews() {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; }
  catch (e) { return []; }
}
function _saveReviews(arr) { localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr)); }

function placesGetReviews(placeId) {
  return _loadReviews().filter(function (r) { return r.placeId === placeId; });
}

function placesAverageRating(placeId) {
  var list = placesGetReviews(placeId);
  if (!list.length) return 0;
  var sum = list.reduce(function (s, r) { return s + Number(r.rating || 0); }, 0);
  return sum / list.length;
}

function placesAddReview(placeId, review) {
  var all = _loadReviews();
  all.push({
    placeId: placeId,
    name: review.name || 'زائر',
    email: review.email || '',
    rating: Number(review.rating) || 5,
    text: review.text || '',
    when: Date.now(),
  });
  _saveReviews(all);
}

function placesGetReviewsByUser(email) {
  if (!email) return [];
  return _loadReviews().filter(function (r) { return r.email === email; });
}

/* ============= المصادقة (Auth) =============
   يحاول قراءة المستخدم من Supabase (نفس session ساحة) إن كان محمّلاً.
   يقع بأمان إلى null إذا Supabase مو محمّل — الصفحات ما تنكسر. */
function authGetUser() {
  // محاولة قراءة الاسم/البريد من localStorage الخاص بـsahat (نفس المفتاح الذي يستخدمه Supabase عند remember)
  try {
    var keys = Object.keys(localStorage);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('supabase.auth.token') === 0 || keys[i].indexOf('sb-') === 0) {
        var raw = localStorage.getItem(keys[i]);
        var obj = JSON.parse(raw);
        var u = (obj && (obj.currentSession || obj)) || null;
        if (u && u.user) {
          return {
            name: (u.user.user_metadata && u.user.user_metadata.name) || (u.user.email || '').split('@')[0],
            email: u.user.email || '',
          };
        }
      }
    }
  } catch (e) { /* تجاهل — نرجع null */ }
  return null;
}

function authLogin(_email, _password) {
  // التسجيل الفعلي يتم عبر ساحة (../login.html) — هذه الدالة موجودة لتوافق النداء فقط
  window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.pathname);
}
function authSignup(_email, _password) {
  window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.pathname);
}
function authLogout() {
  window.location.href = '../login.html';
}
function authContinueWithSaha() { authLogin(); }

/* ============= المفضلة (Favorites) — localStorage ============= */
var FAVORITES_KEY = 'saaha_tourism_favorites';

function favoritesGetAll() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
  catch (e) { return []; }
}
function _saveFavorites(arr) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr)); }

function favoritesToggle(id) {
  var favs = favoritesGetAll();
  var idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
  _saveFavorites(favs);
  return favs.indexOf(id) >= 0;
}

/* يوصّل كل زر داخل حاوية معيّنة (زر مفضلة): يبدّل الحالة عند الضغط */
function favoritesWireButtons(root) {
  if (!root) return;
  var favs = favoritesGetAll();
  var buttons = root.querySelectorAll('.fav-btn, [data-fav-id]');
  buttons.forEach(function (btn) {
    var id = btn.getAttribute('data-id') || btn.getAttribute('data-fav-id');
    if (!id) return;
    if (favs.indexOf(id) >= 0) btn.classList.add('is-fav');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var on = favoritesToggle(id);
      btn.classList.toggle('is-fav', on);
    });
  });
}

async function addedPlacesGetByUser(email) {
  if (typeof sb === 'undefined') return [];
  try {
    var userRes = await sb.auth.getUser();
    var user = userRes && userRes.data && userRes.data.user;
    if (!user && !email) return [];
    var q = sb.from('tourism_places')
      .select('*')
      .order('created_at', { ascending: false });
    if (user) q = q.eq('added_by', user.id);
    var res = await q;
    if (res.error) throw res.error;
    return (res.data || []).map(function (row) {
      var p = tourismRowToPlace(row);
      p.loc = [p.area, p.city].filter(Boolean).join('، ');
      p.status = row.status === 'approved' ? 'موافق عليه' : row.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
      return p;
    });
  } catch (e) {
    console.error('addedPlacesGetByUser failed:', e);
    return [];
  }
}

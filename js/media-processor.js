/* =========================================================
   ساحة — معالجة الصور (ضغط + علامة مائية)
   مقتبس من add-ad.html (نفس المنطق تماماً)، ومعمّم ليعمل بكل الأقسام.
   يُحمّل من كل قسم عبر ../js/media-processor.js
   ========================================================= */
(function () {
  // MAX_DIM: أقصى بُعد لأي ضلع؛ ما نكبّر الصور الأصغر أبداً.
  const MAX_DIM = 1280;
  // جودة WebP (0.85 = توازن ممتاز بين الحجم والجودة).
  const WEBP_QUALITY = 0.85;

  /**
   * يعالج ملف صورة: يضغطه لـWebP + يضيف علامة مائية أسفل-يمين.
   * @param {File|Blob} file - ملف الصورة الأصلي
   * @param {Object} opts
   * @param {string} [opts.label='ساحة'] - نص العلامة المائية
   * @param {'blob'|'dataurl'} [opts.output='blob'] - نوع الإخراج
   * @returns {Promise<Blob|string>}
   */
  async function processImage(file, opts = {}) {
    const label = opts.label || 'ساحة';
    const output = opts.output || 'blob';
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = async () => {
          try {
            let width = img.width, height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
              const scale = MAX_DIM / Math.max(width, height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const margin = Math.max(16, Math.round(width * 0.03));
            const fontSize = Math.max(20, Math.round(width * 0.06));
            const fontSpec = `900 ${fontSize}px AlwiSahafa, Cairo, sans-serif`;
            try { await document.fonts.load(fontSpec); } catch (_) { /* fallback */ }
            ctx.direction = 'rtl';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.font = fontSpec;
            ctx.fillStyle = '#15264a';
            ctx.save();
            ctx.translate(width - margin, height - margin);
            ctx.scale(1.5, 1);
            ctx.fillText(label, 0, 0);
            ctx.restore();

            if (output === 'dataurl') {
              resolve(canvas.toDataURL('image/webp', WEBP_QUALITY));
            } else {
              canvas.toBlob(
                (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
                'image/webp',
                WEBP_QUALITY
              );
            }
          } catch (err) { reject(err); }
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // نشر على window للاستخدام العام (ما نستعمل ES modules عشان نحافظ على النمط الحالي).
  window.MediaProcessor = { processImage, MAX_DIM, WEBP_QUALITY };
})();

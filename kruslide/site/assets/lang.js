/* KruSlide: choose the page language before the first paint (Thai by default).
   ?lang=en or ?lang=th wins; otherwise the last choice saved on this device; otherwise Thai. */
(function () {
  var l = null;
  try { l = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  if (l !== 'en' && l !== 'th') { try { l = localStorage.getItem('ks-lang'); } catch (e) {} }
  document.documentElement.lang = l === 'en' ? 'en' : 'th';
  document.documentElement.classList.add('js');
})();

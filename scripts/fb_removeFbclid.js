export default {
  icon: '<i class="fa-solid fa-link-slash fa-lg"></i>',
  name: {
    en: "Auto remove Fbclid from link",
    vi: "Tự động xóa Fbclid từ liên kết",
  },
  description: {
    en: "Auto remove Facebook click identifier (Fbclid) parameter from links",
    vi: "Tự động xóa địa chỉ theo dõi của facebook (Fbclid) từ liên kết",
  },
  infoLink: "https://viblo.asia/p/lo-hong-clickjacking-aWj536e1l6m",
  whiteList: ["http://*/*", "https://*/*"],

  onDocumentStart: () => {
    var url = new URL(window.top.location.href);
    if (url.searchParams.has("fbclid")) {
      url.searchParams.delete("fbclid");
      window.top.location.replace(url);
    }
  },
};

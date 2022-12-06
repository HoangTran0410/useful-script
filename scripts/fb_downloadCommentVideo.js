import fb_storySaver from "./fb_storySaver.js";

export default {
  icon: '<i class="fa-regular fa-message"></i>',
  name: {
    en: "Download facebook comment video",
    vi: "Tải video trong comment facebook",
  },
  description: {
    en: "Download video in facebook comment that you are watching",
    vi: "Tải video trong bình luận bạn đang xem",
  },
  whiteList: [],
  runInExtensionContext: false,

  func: fb_storySaver.func,
};

async function backup() {
  // DYL extension: Get video from comment id (quality: SD)
  let commendId = "2009814422684001";
  let access_token = "...";
  let res = await fetch(
    "https://graph.facebook.com/v8.0/" +
      commendId +
      "?fields=attachment&access_token=" +
      access_token
  );
  let json = await res.json();
  return json.attachment.media.source;
}

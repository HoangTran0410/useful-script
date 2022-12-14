export default {
  icon: "",
  name: {
    en: "View Facebook Story information",
    vi: "Xem thông tin của Facebook Story",
  },
  description: {
    en: "Get facebook story info",
    vi: "Xem thông tin story",
  },

  onClick: async function () {
    try {
      let storyId = UsefulScriptGlobalPageContext.Facebook.getStoryId();
      let storyBucketId =
        UsefulScriptGlobalPageContext.Facebook.getStoryBucketIdFromStoryId(
          storyId
        );
      if (!storyBucketId) throw new Error("Không tìm thấy story nào.");

      let fb_dtsg = await UsefulScriptGlobalPageContext.Facebook.getFbdtsg();
      let storyInfo = await UsefulScriptGlobalPageContext.Facebook.getStoryInfo(
        storyBucketId,
        fb_dtsg
      );
      console.log(storyInfo);
    } catch (e) {
      alert("ERROR: " + e);
    }
  },
};

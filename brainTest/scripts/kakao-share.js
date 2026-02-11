(function () {
  const DEFAULT_APP_KEY = "af0f520240f2c824b721bbd002c45178";

  function getAppKey() {
    if (window.__KAKAO_APP_KEY__) return window.__KAKAO_APP_KEY__;
    return DEFAULT_APP_KEY;
  }

  function ensureKakaoInitialized() {
    if (!window.Kakao) {
      console.warn("Kakao SDK가 로드되지 않았습니다.");
      return false;
    }
    if (window.Kakao.isInitialized()) return true;
    const appKey = getAppKey();
    if (!appKey) {
      console.warn("카카오 앱 키를 설정해 주세요.");
      return false;
    }
    window.Kakao.init(appKey);
    return true;
  }

  window.setupKakaoShare = function setupKakaoShare(buttonId, content) {
    const target =
      typeof buttonId === "string" ? document.getElementById(buttonId) : buttonId;
    if (!target || !content) return;

    target.addEventListener("click", () => {
      if (!ensureKakaoInitialized()) {
        alert("카카오 공유 설정을 확인해 주세요.");
        return;
      }

      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: content.title,
          description: content.description,
          imageUrl: content.imageUrl,
          link: {
            mobileWebUrl: content.webUrl,
            webUrl: content.webUrl,
          },
        },
        buttons:
          content.buttons ||
          [
            {
              title: "테스트 하러가기",
              link: {
                mobileWebUrl: content.webUrl,
                webUrl: content.webUrl,
              },
            },
          ],
      });
    });
  };
})();

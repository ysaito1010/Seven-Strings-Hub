// ==========================================
// 初期化入口（SPA / 通常読み込みの両方に対応）
// ==========================================
function initDownloadPage() {
  console.log("initDownloadPage が呼び出されました");

  const urlParams = new URLSearchParams(window.location.search);
  const trackId = parseInt(urlParams.get("id"), 10);

  // 💡 変更点1：不正なIDだった場合の処理をSPA対応に変更
  if (isNaN(trackId) || trackId < 0) {
    console.warn("不正なトラックIDです。");
    $("#dl-track-title").text("不正なアクセスです。");
    $("#dl-actual-btn").addClass("disabled").text("ダウンロード不可");
    return;
  }

  // music.js がすでに読み込んで保持しているキャッシュ（loadTrackListData）があればそれを使い、
  // なければ直接 php/get_tracks.php からデータを取得する（直アクセスの安全対策）
  const trackListRequest = window.loadTrackListData
    ? window.loadTrackListData()
    : $.ajax({
        url: "php/get_tracks.php",
        type: "GET",
        dataType: "json",
      });

  trackListRequest
    .done(function (trackList) {
      const track = trackList[trackId];

      if (track) {
        // 各種テキストの流し込み
        $("#dl-track-title").text(track.title);
        $("#dl-track-genre").text(track.genre);
        $("#dl-track-desc").text(track.description);
        $("#dl-track-bpm").text(track.bpm);
        $("#dl-track-duration").text(track.duration);

        // ボタンの活性化とDL属性の付与
        $("#dl-actual-btn")
          .removeClass("disabled")
          .attr("href", track.url)
          .attr("download", track.title + ".mp3")
          .html('<i class="fa-solid fa-download me-1"></i> ダウンロード');

        // タブのタイトルを更新
        document.title = "DOWNLOAD | " + track.title;
      } else {
        $("#dl-track-title").text("音源が見つかりませんでした。");
        $("#dl-actual-btn").addClass("disabled").text("ダウンロード不可");
      }
    })
    .fail(function () {
      console.error("音楽データの取得に失敗しました。");
      $("#dl-track-title").text("データの取得に失敗しました。");
    });
}

// 外部（router.js）から呼び出せるようにグローバル展開
window.initDownloadPage = initDownloadPage;

// 💡 変更点2：現在のURLが「download.html」のときだけ自動初期化を走らせる
$(function () {
  if (location.pathname.toLowerCase().includes("download.html")) {
    initDownloadPage();
  }
});
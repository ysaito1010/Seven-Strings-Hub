// ==========================================
// データ（音源トラック情報）※PHPから動的に取得するため最初は空にする
// ==========================================
let trackList = [];

// ==========================================
// グローバルプレイヤー管理変数
// ==========================================
let currentTrackIndex = -1;
let isPlaying = false;
const audioInstance = new Audio(); // HTML5 Audio
let audioEventsBound = false;
let trackListRequest = null;

// ==========================================
// 初期化入口（SPA / 通常読み込みの両方に対応）
// ==========================================
function initArchivePage() {
  console.log("initArchivePage が呼び出されました");
  
  // 💡 変更点1：非同期遷移のたびに確実にイベントを結び直すため、毎回イベントバインドを実行
  bindArchiveEvents();

  setupScrollBehavior();
  initAudioEvents();

  // 💡 変更点2：データがすでにロード済みであっても、確実に描画とUI更新に繋げる
  loadTrackList()
    .done(function () {
      renderTrackList();
      updateUIState();
    })
    .fail(function () {
      console.error(
        "音楽データの取得に失敗しました。php/get_tracks.php の配置や記述を確認してください。",
      );
    });
}

function bindArchiveEvents() {
  // 💡 変更点3：onの前にoffを挟み、SPA遷移で何度もバインドされても多重発火しないよう徹底ガード
  $(document)
    .off("click.sshTrack", ".ssh-play-card-btn")
    .on("click.sshTrack", ".ssh-play-card-btn", function () {
      const index = parseInt($(this).attr("data-track-index"), 10);
      handleTrackClick(index);
    });

  $("#ssh-global-play-btn")
    .off("click.sshGlobal")
    .on("click.sshGlobal", function () {
      togglePlayState();
    });

  $("#ssh-progress-container")
    .off("click.sshGlobal")
    .on("click.sshGlobal", function (e) {
      seekAudio(e);
    });

  $("#ssh-close-player-btn")
    .off("click.sshGlobal")
    .on("click.sshGlobal", function () {
      stopAudio();
      $("#ssh-global-player").removeClass("active");
    });

  $(document)
    .off("input.sshVolume", "#ssh-volume-slider")
    .on("input.sshVolume", "#ssh-volume-slider", function () {
      const volumeValue = $(this).val();
      audioInstance.volume = volumeValue;

      const $volIcon = $("#ssh-volume-icon");
      if ($volIcon.length === 0) return;

      if (parseFloat(volumeValue) === 0) {
        $volIcon
          .removeClass("fa-volume-high fa-volume-low")
          .addClass("fa-volume-xmark");
      } else if (parseFloat(volumeValue) < 0.4) {
        $volIcon
          .removeClass("fa-volume-high fa-volume-xmark")
          .addClass("fa-volume-low");
      } else {
        $volIcon
          .removeClass("fa-volume-low fa-volume-xmark")
          .addClass("fa-volume-high");
      }
    });
}

function loadTrackList() {
  if (trackList.length > 0) {
    return $.Deferred().resolve(trackList).promise();
  }

  if (trackListRequest) {
    return trackListRequest;
  }

  trackListRequest = $.ajax({
    url: "php/get_tracks.php",
    type: "GET",
    dataType: "json",
  })
    .done(function (data) {
      trackList = data;
    })
    .fail(function () {
      console.error(
        "音楽データの取得に失敗しました。php/get_tracks.php の配置や記述を確認してください。",
      );
      trackListRequest = null;
    });

  return trackListRequest;
}

// 外部（router.js）から呼び出せるようにグローバル展開
window.loadTrackListData = loadTrackList;
window.initArchivePage = initArchivePage;

// 💡 変更点4：現在のURLが「アーカイブ」または「トップ」のときだけ自動初期化を走らせる
$(function () {
  const currentPath = location.pathname.toLowerCase();
  if (currentPath.includes("archive.html") || currentPath === "/" || currentPath.endsWith("index.html")) {
    initArchivePage();
  }
});

// ==========================================
// 自作JavaScript関数 (キャメルケース)
// ==========================================

function renderTrackList() {
  const $container = $("#ssh-archive-container");
  if ($container.length === 0) return; // コンテナがなければ処理をスキップ（about.htmlなど）
  $container.empty();

  if (trackList.length === 0) {
    $container.html(
      '<div class="col-12 text-center text-white py-5"><p>公開可能な音源トラックがありません。</p></div>',
    );
    return;
  }

  const isTopPage = !location.pathname.includes("archive.html");
  const displayLimit = isTopPage ? 3 : trackList.length;

  for (let index = 0; index < displayLimit; index++) {
    if (!trackList[index]) break;

    const track = trackList[index];

    const cardHtml = `
      <div class="col-md-4 mb-4">
        <div class="card ssh-track-card h-100" data-track-index="${index}">
          <div class="card-body d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="text-info badge ssh-custom-badge">${track.genre}</span>
                <small class="ssh-track-meta"><i class="fa-solid fa-wave-square me-1"></i>BPM: ${track.bpm}</small>
              </div>
              <h4 class="ssh-track-title h5 mb-3">${track.title}</h4>
              <p class="text-muted ssh-track-desc small mb-4">${track.description}</p>
            </div>
            <div class="d-flex justify-content-between align-items-center pt-2">
              <span class="text-secondary small"><i class="fa-regular fa-clock me-1"></i>${track.duration}</span>
              <div>
                <button class="btn ssh-btn-outline btn-sm ssh-play-card-btn px-3 me-2" data-track-index="${index}">
                  <i class="fa-solid fa-play me-1"></i> 試聴する
                </button>
                <a href="download.html?id=${index}" class="btn btn-info btn-sm px-3 fw-bold text-dark">
                  <i class="fa-solid fa-download me-1"></i> DL
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    $container.append(cardHtml);
  }
}

function setupScrollBehavior() {
  // 1. ナビゲーションのクリックによるスムーススクロール処理
  $(".ssh-nav-link")
    .off("click.sshScroll")
    .on("click.sshScroll", function (e) {
      const target = $(this).attr("href");
      
      // hrefが「#」から始まるページ内リンクの場合だけスクロールを動かす
      if (target && target.startsWith("#")) {
        e.preventDefault();

        $(".ssh-nav-link").removeClass("active");
        $(`a[href="${target}"]`).addClass("active");

        $("html, body").animate(
          {
            scrollTop: $(target).offset().top - 80,
          },
          600,
        );
      }
    });

  // 2. スクロール位置に応じて active を切り替える処理
  $(window).off("scroll.sshScroll"); // 一旦クリア
  
  $(window).on("scroll.sshScroll", function () {
    const currentPath = location.pathname.toLowerCase();
    const isTopPage = currentPath === "/" || currentPath.endsWith("index.html") || !currentPath.includes(".html");
    
    // トップページじゃなければ何もしない（他のページはルーターのactiveを維持）
    if (!isTopPage) {
      return; 
    }

    const scrollPos = $(window).scrollTop() + 100;
    let anySectionActive = false;

    $("section, header").each(function () {
      const id = $(this).attr("id");
      if (id) {
        const top = $(this).offset().top;
        const bottom = top + $(this).outerHeight();

        // 現在のスクロール位置がセクション内にあるか判定
        if (scrollPos >= top && scrollPos <= bottom) {
          anySectionActive = true;
          $(".ssh-nav-link").removeClass("active");
          
          // 💡 対策：ページ内リンク（#id）と、通常のHomeリンク（index.html）の両方に active をつける
          $(`.ssh-nav-link[href="#${id}"]`).addClass("active");
          $(`.ssh-nav-link[href="index.html"]`).addClass("active");
          $(`.ssh-nav-link[href="/"]`).addClass("active");
        }
      }
    });

    // 💡 対策2：もしどのセクションの隙間にも属していない場合でも、Homeの active は維持する
    if (!anySectionActive) {
      $(`.ssh-nav-link[href="index.html"]`).addClass("active");
      $(`.ssh-nav-link[href="/"]`).addClass("active");
    }
  });
}

function handleTrackClick(index) {
  if (currentTrackIndex === index) {
    togglePlayState();
  } else {
    playNewTrack(index);
  }
}

function playNewTrack(index) {
  currentTrackIndex = index;
  const track = trackList[index];

  if (!track) return;

  audioInstance.src = track.url;
  audioInstance.load();

  const $slider = $("#ssh-volume-slider");
  audioInstance.volume = $slider.length > 0 ? $slider.val() : 0.5;

  $("#ssh-player-title").text(track.title);
  $("#ssh-player-genre").text(track.genre);

  $("#ssh-global-player").addClass("active");

  audioInstance
    .play()
    .catch((err) => console.log("再生エラー（ユーザー操作起因）:", err));
  isPlaying = true;
  updateUIState();
}

function togglePlayState() {
  if (currentTrackIndex === -1 && trackList.length > 0) {
    playNewTrack(0);
    return;
  }

  if (isPlaying) {
    audioInstance.pause();
    isPlaying = false;
  } else {
    audioInstance.play().catch((err) => console.log(err));
    isPlaying = true;
  }
  updateUIState();
}

function stopAudio() {
  audioInstance.pause();
  audioInstance.currentTime = 0;
  isPlaying = false;
  currentTrackIndex = -1;
  updateUIState();
}

function updateUIState() {
  const $globalPlayIcon = $("#ssh-global-play-btn i");
  if (isPlaying) {
    $globalPlayIcon.removeClass("fa-play").addClass("fa-pause");
  } else {
    $globalPlayIcon.removeClass("fa-pause").addClass("fa-play");
  }

  $(".ssh-play-card-btn").each(function () {
    const btnIdx = parseInt($(this).attr("data-track-index"), 10);

    if (btnIdx === currentTrackIndex && isPlaying) {
      $(this)
        .addClass("active")
        .html('<i class="fa-solid fa-pause me-1"></i> 一時停止');
    } else {
      $(this)
        .removeClass("active")
        .html('<i class="fa-solid fa-play me-1"></i> 試聴する');
    }
  });
}

function initAudioEvents() {
  if (audioEventsBound) return;

  audioInstance.addEventListener("loadedmetadata", function () {
    $("#ssh-total-time").text(formatTime(audioInstance.duration));
  });

  audioInstance.addEventListener("timeupdate", function () {
    if (!isNaN(audioInstance.duration)) {
      const current = audioInstance.currentTime;
      const duration = audioInstance.duration;
      const percentage = (current / duration) * 100;

      $("#ssh-progress-inner").css("width", percentage + "%");
      $("#ssh-current-time").text(formatTime(current));
      $("#ssh-total-time").text(formatTime(duration));
    }
  });

  audioInstance.addEventListener("ended", function () {
    if (currentTrackIndex < trackList.length - 1) {
      playNewTrack(currentTrackIndex + 1);
    } else {
      stopAudio();
    }
  });

  audioEventsBound = true;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function seekAudio(event) {
  if (currentTrackIndex === -1) return;

  const $progressBar = $("#ssh-progress-container");
  const containerWidth = $progressBar.width();
  const clickPosition = event.pageX - $progressBar.offset().left;
  const newPercentage = clickPosition / containerWidth;

  if (!isNaN(audioInstance.duration)) {
    audioInstance.currentTime = newPercentage * audioInstance.duration;
  }
}
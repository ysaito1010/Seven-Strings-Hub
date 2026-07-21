<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$correct_password = 'ssh777';

if (
    isset($_FILES['mp3_file']) && 
    isset($_POST['upload_password']) && 
    isset($_POST['track_bpm']) && 
    isset($_POST['track_duration']) &&
    isset($_POST['track_genre']) &&
    isset($_POST['track_desc'])
) {

    $file_name  = $_FILES['mp3_file']['name'];     
    $file_tmp   = $_FILES['mp3_file']['tmp_name']; 
    $file_error = $_FILES['mp3_file']['error'];   
    $input_password = $_POST['upload_password'];

    $bpm       = intval($_POST['track_bpm']);
    $duration  = $_POST['track_duration']; 
    $genre     = $_POST['track_genre'];    
    $desc      = $_POST['track_desc']; // 💡紹介文

    if ($input_password !== $correct_password) {
        die("❌ パスワードが間違っています。アップロード権限がありません。");
    }

    if ($file_error === 0) {
        $pure_name = pathinfo($file_name, PATHINFO_FILENAME);
        
        $duration_safe = str_replace(':', '-', $duration);
        $genre_safe    = str_replace(['/', ' ', ' '], ['', '', ''], $genre); 
        
        // 💡 ファイル名は短くシンプルにする（エラー回避）
        $base_name = $pure_name . '__' . $bpm . '__' . $duration_safe . '__' . $genre_safe;
        $new_file_name = $base_name . '.mp3';
        
        $destination = '../uploads/' . $new_file_name;

        if (move_uploaded_file($file_tmp, $destination)) {
            
            // 💡 【ここがポイント】紹介文だけを同じ名前の「.txt」ファイルとして保存する
            $txt_destination = '../uploads/' . $base_name . '.txt';
            file_put_contents($txt_destination, $desc);

            ?>
            <!DOCTYPE html>
            <html lang="ja">
            <head>
              <meta charset="UTF-8">
              <title>Seven Strings Hub - アップロード完了</title>
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
              <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet">
              <link rel="stylesheet" href="../css/style.css"> 
            </head>
            <body class="d-flex align-items-center justify-content-center" style="background-color: var(--color-bg-main); min-height: 100vh;">
              <div class="container text-center" style="max-width: 500px;">
                <div class="ssh-track-card p-5 text-center">
                  <div class="text-info display-1 mb-4"><i class="fa-solid fa-circle-check"></i></div>
                  <h2 class="ssh-text-seven h3 mb-3">UPLOAD SUCCESS</h2>
                  <p class="text-muted small mb-4">
                    ファイル「<span class="text-white fw-bold"><?php echo htmlspecialchars($pure_name); ?></span>」を登録しました！
                  </p>
                  <a href="../index.html" class="btn ssh-btn-outline ssh-nav-link w-100 py-3"><i class="fa-solid fa-house me-2"></i>メインページに戻る</a>
                </div>
              </div>
            </body>
            </html>
            <?php
        } else {
            echo "❌ フォルダへの保存に失敗しました。";
        }
    } else {
        echo "❌ アップロードエラー。コード: " . $file_error;
    }
} else {
    echo "❌ 必要なデータが届いていません。";
}
?>
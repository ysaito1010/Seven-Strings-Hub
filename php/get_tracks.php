<?php
header('Content-Type: application/json; charset=utf-8');

$dir = dirname(__DIR__) . '/uploads/'; 
$trackList = [];
$id = 1;

if (is_dir($dir)) {
    $files = scandir($dir);
    
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..' && strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'mp3') {
            
            $file_name_without_ext = pathinfo($file, PATHINFO_FILENAME);
            $parts = explode('__', $file_name_without_ext);
            
            $title    = $file_name_without_ext;
            $bpm      = '---';
            $duration = '--:--';
            $genre    = 'Metal / Hard Rock';
            $desc     = '曲の紹介文がありません。'; // 初期値
            
            if (count($parts) === 4) {
                $title    = $parts[0];
                $bpm      = $parts[1];
                $duration = str_replace('-', ':', $parts[2]);
                
                if (strpos($parts[3], 'Djent') !== false) {
                    $genre = 'Djent / Progressive Metal';
                } elseif (strpos($parts[3], 'Cyber') !== false) {
                    $genre = 'Cyber Metal / Synthwave';
                } else {
                    $genre = 'Hard Rock / Metalcore';
                }
                
                // 💡 【ここがポイント】対になるテキストファイルがあれば、その中身を紹介文として読み込む
                $txt_file = $dir . $file_name_without_ext . '.txt';
                if (file_exists($txt_file)) {
                    $desc = file_get_contents($txt_file);
                }
            }
            
            $trackList[] = [
                'id'          => $id++,
                'title'       => $title,
                'genre'       => $genre,    
                'bpm'         => $bpm,      
                'duration'    => $duration, 
                'url'         => 'uploads/' . $file, 
                'description' => $desc      
            ];
        }
    }
}

$trackList = array_reverse($trackList);
echo json_encode($trackList, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
?>
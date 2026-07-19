$ErrorActionPreference = "Stop"
$videoDepsPath = Join-Path $env:TEMP "collab-docs-video-deps"
$ffmpeg = Join-Path $videoDepsPath "node_modules\ffmpeg-static\ffmpeg.exe"
$assets = Join-Path $PSScriptRoot "..\walkthrough-assets"

for ($index = 1; $index -le 8; $index++) {
  $number = $index.ToString("00")
  $image = Get-ChildItem -LiteralPath $assets -Filter "$number-*.png" | Select-Object -First 1
  $audio = Get-ChildItem -LiteralPath $assets -Filter "$number-*.wav" | Select-Object -First 1
  $sceneVideo = Join-Path $assets "scene-$number.mp4"
  & $ffmpeg -y -loop 1 -framerate 30 -i $image.FullName -i $audio.FullName -c:v libx264 -tune stillimage -c:a aac -b:a 160k -pix_fmt yuv420p -shortest $sceneVideo
  if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed for scene $number" }
}

$concatFile = Join-Path $assets "concat.txt"
$finalVideo = Join-Path $PSScriptRoot "..\walkthrough-video.mp4"
& $ffmpeg -y -f concat -safe 0 -i $concatFile -c copy -movflags +faststart $finalVideo
if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed while concatenating scenes" }

& $ffmpeg -i $finalVideo

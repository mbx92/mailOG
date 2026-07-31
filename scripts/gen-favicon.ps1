Add-Type -AssemblyName System.Drawing

function New-LogoBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $scale = $size / 32.0
  $penW = [Math]::Max(1.5, 2 * $scale)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 20, 86, 240)), $penW
  $g.DrawEllipse($pen, 1 * $scale, 1 * $scale, 29 * $scale, 29 * $scale)
  $g.DrawRectangle($pen, 8 * $scale, 11 * $scale, 16 * $scale, 11 * $scale)
  $pts = @(
    (New-Object System.Drawing.PointF (8.5 * $scale), (12.5 * $scale)),
    (New-Object System.Drawing.PointF (16 * $scale), (18 * $scale)),
    (New-Object System.Drawing.PointF (23.5 * $scale), (12.5 * $scale))
  )
  $g.DrawLines($pen, $pts)
  $pen.Dispose()
  $g.Dispose()
  return $bmp
}

# Build ICO with embedded PNG images (modern ICO format)
function Write-PngIco([string]$path, [int[]]$sizes) {
  $pngs = @()
  foreach ($s in $sizes) {
    $bmp = New-LogoBitmap $s
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngs += , $ms.ToArray()
    $ms.Dispose()
    $bmp.Dispose()
  }

  $fs = [System.IO.File]::Create($path)
  $bw = New-Object System.IO.BinaryWriter $fs

  # ICONDIR
  $bw.Write([uint16]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]$pngs.Count)

  $offset = 6 + (16 * $pngs.Count)
  for ($i = 0; $i -lt $pngs.Count; $i++) {
    $s = $sizes[$i]
    $data = $pngs[$i]
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$data.Length)
    $bw.Write([uint32]$offset)
    $offset += $data.Length
  }
  foreach ($data in $pngs) {
    $bw.Write($data)
  }
  $bw.Flush()
  $fs.Close()
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $projectRoot

Write-PngIco (Join-Path $projectRoot 'public\favicon.ico') @(16, 32, 48)
$png = New-LogoBitmap 32
$png.Save((Join-Path $projectRoot 'public\favicon-32.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$png.Dispose()
Write-Host "Wrote favicon.ico size=$((Get-Item (Join-Path $projectRoot 'public\favicon.ico')).Length)"

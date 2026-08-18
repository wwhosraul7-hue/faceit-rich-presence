Add-Type -AssemblyName System.Drawing

function New-IconFrame([int]$size) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $orange = [System.Drawing.Color]::FromArgb(255, 255, 85, 0)   # FACEIT orange

    $brush = [System.Drawing.SolidBrush]::new($orange)
    $pad = [Math]::Max(1, [int]($size * 0.06))
    $rectSize = $size - ($pad * 2)
    $radius = [Math]::Max(2, [int]($size * 0.22))

    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = $radius * 2
    $x = $pad; $y = $pad
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $rectSize - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $rectSize - $d, $y + $rectSize - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $rectSize - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)

    $fontSize = [single]($size * 0.56)
    $font = [System.Drawing.Font]::new("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = [System.Drawing.RectangleF]::new(0, ($size * -0.03), $size, $size)
    $g.DrawString("F", $font, $textBrush, $rect, $sf)

    $g.Dispose()
    return $bmp
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$frames = @()
foreach ($s in $sizes) { $frames += ,(New-IconFrame $s) }

$outPath = Join-Path $PSScriptRoot "icon.ico"
$fs = [System.IO.FileStream]::new($outPath, [System.IO.FileMode]::Create)
$bw = [System.IO.BinaryWriter]::new($fs)

# ICONDIR
$bw.Write([UInt16]0)      # reserved
$bw.Write([UInt16]1)      # type = icon
$bw.Write([UInt16]$frames.Count)

$imageDataList = @()
foreach ($bmp in $frames) {
    $ms = [System.IO.MemoryStream]::new()
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $imageDataList += ,$ms.ToArray()
}

$offset = 6 + (16 * $frames.Count)
for ($i = 0; $i -lt $frames.Count; $i++) {
    $s = $sizes[$i]
    $data = $imageDataList[$i]
    $wByte = if ($s -ge 256) { 0 } else { $s }
    $hByte = if ($s -ge 256) { 0 } else { $s }
    $bw.Write([Byte]$wByte)
    $bw.Write([Byte]$hByte)
    $bw.Write([Byte]0)     # color palette
    $bw.Write([Byte]0)     # reserved
    $bw.Write([UInt16]1)   # color planes
    $bw.Write([UInt16]32)  # bits per pixel
    $bw.Write([UInt32]$data.Length)
    $bw.Write([UInt32]$offset)
    $offset += $data.Length
}
foreach ($data in $imageDataList) {
    $bw.Write($data)
}
$bw.Flush()
$fs.Close()

foreach ($bmp in $frames) { $bmp.Dispose() }

Write-Host "Icon written to $outPath"

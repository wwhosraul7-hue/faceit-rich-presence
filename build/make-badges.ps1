Add-Type -AssemblyName System.Drawing

function Lerp([double]$a, [double]$b, [double]$t) { return $a + ($b - $a) * $t }

function LerpColor($c1, $c2, [double]$t) {
    $r = [int][Math]::Round((Lerp $c1.R $c2.R $t))
    $g = [int][Math]::Round((Lerp $c1.G $c2.G $t))
    $b = [int][Math]::Round((Lerp $c1.B $c2.B $t))
    return [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

function Luminance($c) {
    return (0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B)
}

$palettes = @{
    orange = @{
        light = [System.Drawing.Color]::FromArgb(255, 255, 214, 179)
        dark  = [System.Drawing.Color]::FromArgb(255, 179, 42, 0)
    }
    blue = @{
        light = [System.Drawing.Color]::FromArgb(255, 191, 223, 255)
        dark  = [System.Drawing.Color]::FromArgb(255, 11, 61, 145)
    }
    purple = @{
        light = [System.Drawing.Color]::FromArgb(255, 228, 209, 255)
        dark  = [System.Drawing.Color]::FromArgb(255, 91, 33, 182)
    }
}

$outRoot = Join-Path (Split-Path $PSScriptRoot -Parent) "assets\badges"
New-Item -ItemType Directory -Force -Path $outRoot | Out-Null

foreach ($paletteName in $palettes.Keys) {
    $paletteDir = Join-Path $outRoot $paletteName
    New-Item -ItemType Directory -Force -Path $paletteDir | Out-Null

    $light = $palettes[$paletteName].light
    $dark = $palettes[$paletteName].dark

    for ($level = 1; $level -le 10; $level++) {
        $t = ($level - 1) / 9.0
        $bg = LerpColor $light $dark $t

        $size = 128
        $bmp = [System.Drawing.Bitmap]::new($size, $size)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
        $g.Clear([System.Drawing.Color]::Transparent)

        $pad = 4
        $rectSize = $size - ($pad * 2)
        $radius = 30
        $d = $radius * 2

        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $x = $pad; $y = $pad
        $path.AddArc($x, $y, $d, $d, 180, 90)
        $path.AddArc($x + $rectSize - $d, $y, $d, $d, 270, 90)
        $path.AddArc($x + $rectSize - $d, $y + $rectSize - $d, $d, $d, 0, 90)
        $path.AddArc($x, $y + $rectSize - $d, $d, $d, 90, 90)
        $path.CloseFigure()

        $brush = [System.Drawing.SolidBrush]::new($bg)
        $g.FillPath($brush, $path)

        # thin border for definition against Discord's own dark theme
        $borderColor = [System.Drawing.Color]::FromArgb(70, 0, 0, 0)
        $pen = [System.Drawing.Pen]::new($borderColor, 3)
        $g.DrawPath($pen, $path)

        $textColor = if ((Luminance $bg) -gt 150) { [System.Drawing.Color]::FromArgb(255, 30, 22, 15) } else { [System.Drawing.Color]::White }
        $textBrush = [System.Drawing.SolidBrush]::new($textColor)

        $font = [System.Drawing.Font]::new("Segoe UI", 56, [System.Drawing.FontStyle]::Bold)
        $sf = [System.Drawing.StringFormat]::new()
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $rect = [System.Drawing.RectangleF]::new(0, ($size * -0.02), $size, $size)
        $g.DrawString([string]$level, $font, $textBrush, $rect, $sf)

        $g.Dispose()

        $outPath = Join-Path $paletteDir "level_$level.png"
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
}

Write-Host "Badges written to $outRoot"

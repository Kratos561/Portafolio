# ============================================================
#  Servidor local del portafolio — AISAK 3D
#  Necesario para que los videos de YouTube se reproduzcan:
#  una página abierta con file:// no tiene origen y por eso
#  YouTube responde "Error 153" (exige el header Referer).
#
#  Uso normal:  doble clic en ABRIR-WEB.cmd   (recomendado)
#               o bien:  powershell -ExecutionPolicy Bypass -File .\servidor-local.ps1
#
#  Opciones:
#     -Port 8000     puerto (por defecto 8000; si está ocupado busca otro)
#     -NoBrowser     no abre el navegador
#     -Root C:\ruta  sirve otra carpeta
#
#  NOTA TÉCNICA: este script NO usa System.Net.HttpListener a propósito.
#  En algunos entornos (y en PowerShell 7 sobre .NET moderno con el
#  feature switch de HttpListener desactivado) su constructor lanza
#  "PlatformNotSupportedException: Operación no permitida en esta
#  plataforma" y el servidor no arranca nunca. Se usa un
#  System.Net.Sockets.TcpListener, que no depende de HTTP.sys ni de
#  permisos especiales: escucha solo en 127.0.0.1 y habla HTTP/1.1 a mano.
# ============================================================
param(
  [int]$Port = 8000,
  [switch]$NoBrowser,
  [string]$Root
)

$ErrorActionPreference = 'Stop'

$raizScript = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $raizScript) { $raizScript = (Get-Location).Path }
if (-not $Root) { $Root = $raizScript }
if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
  Write-Output ""
  Write-Output "  ERROR: la carpeta indicada en -Root no existe:"
  Write-Output "         $Root"
  Write-Output ""
  exit 1
}
$Root = (Resolve-Path -LiteralPath $Root).Path

# ---------- Puerto libre (hasta 20 intentos) ----------
function Test-PortFree([int]$p) {
  try {
    $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
    $l.Start(); $l.Stop(); return $true
  } catch { return $false }
}

# ---------- Tipos MIME ----------
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.mjs'  = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.map'  = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.png'  = 'image/png'
  '.webp' = 'image/webp'
  '.avif' = 'image/avif'
  '.gif'  = 'image/gif'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.ttf'  = 'font/ttf'
  '.otf'  = 'font/otf'
  '.txt'  = 'text/plain; charset=utf-8'
  '.md'   = 'text/plain; charset=utf-8'
  '.mp4'  = 'video/mp4'
  '.webm' = 'video/webm'
  '.mp3'  = 'audio/mpeg'
  '.pdf'  = 'application/pdf'
  '.xml'  = 'application/xml; charset=utf-8'
  '.zip'  = 'application/zip'
}

# ---------- Pagina 404 ----------
$notFoundHtml = @'
<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>404 - no encontrado</title>
<style>body{background:#0A0A0A;color:#F2EFE6;font-family:ui-monospace,monospace;padding:3rem}
h1{font-size:3rem;margin:0;color:#E10600}a{color:#FF4A3D}</style></head>
<body><h1>404</h1><p>Esa ruta no existe en la carpeta servida.</p>
<p><a href="/index.html">&larr; Volver a la portada</a></p></body></html>
'@
$notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($notFoundHtml)

# ---------- Elegir puerto ----------
$startPort = $Port
while (-not (Test-PortFree $Port)) {
  $Port++
  if ($Port -gt $startPort + 20) { throw "No hay puerto libre entre $startPort y $Port." }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

$url = "http://localhost:$Port/"
Write-Output ""
Write-Output "  ============================================================"
Write-Output "   PORTAFOLIO AISAK 3D - servidor local"
Write-Output "  ============================================================"
Write-Output "   Carpeta : $Root"
Write-Output "   Abriendo: ${url}index.html"
if ($Port -ne $startPort) { Write-Output "   (el puerto $startPort estaba ocupado, se usa $Port)" }
Write-Output ""
Write-Output "   Los videos YA se reproducen desde esta direccion."
Write-Output "   No uses doble clic sobre index.html (file://): ahi YouTube"
Write-Output "   da Error 153 porque no hay Referer."
Write-Output ""
Write-Output "   Para detener el servidor: cierra esta ventana o pulsa Ctrl+C."
Write-Output "  ============================================================"
Write-Output ""

if (-not $NoBrowser) {
  Start-Sleep -Milliseconds 400
  try { Start-Process "${url}index.html" | Out-Null } catch { }
}

# ---------- Bucle de peticiones ----------
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 8000
      $stream = $client.GetStream()

      # ---- Cabecera de la peticion (hasta CRLFCRLF) ----
      $buffer = New-Object byte[] 8192
      $headerText = ''
      while ($headerText -notmatch "`r`n`r`n") {
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) { break }
        $headerText += [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
        if ($headerText.Length -gt 65536) { break }
      }
      if ([string]::IsNullOrWhiteSpace($headerText)) { $client.Close(); continue }

      $headerLines = $headerText -split "`r`n"
      $parts = $headerLines[0] -split ' '
      $method = if ($parts.Count -ge 1) { $parts[0].ToUpperInvariant() } else { 'GET' }
      $rawPath = if ($parts.Count -ge 2) { $parts[1] } else { '/' }

      $rangeHeader = $null
      foreach ($line in $headerLines) {
        if ($line -match '^(?i)Range:\s*(.+)$') { $rangeHeader = $Matches[1].Trim() }
      }

      # ---- Ruta solicitada, sin poder salir de la carpeta servida ----
      $pathOnly = ($rawPath -split '\?')[0]
      try { $pathOnly = [System.Uri]::UnescapeDataString($pathOnly) } catch { }
      $pathOnly = $pathOnly.TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($pathOnly)) { $pathOnly = 'index.html' }
      if ($pathOnly.EndsWith('/')) { $pathOnly += 'index.html' }

      $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, ($pathOnly -replace '/', '\')))

      $insideRoot = $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)
      $exists = $insideRoot -and (Test-Path -LiteralPath $full -PathType Leaf)

      if (-not $exists) {
        $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($notFoundBytes.Length)`r`nConnection: close`r`n`r`n"
        $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
        $stream.Write($headBytes, 0, $headBytes.Length)
        $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        $stream.Flush(); $client.Close(); continue
      }

      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $fileLength = (Get-Item -LiteralPath $full).Length

      if ($method -eq 'HEAD') {
        $head = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $fileLength`r`nAccept-Ranges: bytes`r`nConnection: close`r`n`r`n"
        $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
        $stream.Write($headBytes, 0, $headBytes.Length)
        $stream.Flush(); $client.Close(); continue
      }

      # ---- Peticiones parciales (Range) ----
      $start = 0
      $end = $fileLength - 1
      $partial = $false
      if ($rangeHeader -and $rangeHeader -match '^bytes=(\d*)-(\d*)$') {
        $from = $Matches[1]; $to = $Matches[2]
        if ($from -ne '') { $start = [int64]$from }
        if ($to -ne '') { $end = [int64]$to }
        if ($end -ge $fileLength) { $end = $fileLength - 1 }
        if ($start -le $end) { $partial = $true } else { $start = 0; $end = $fileLength - 1 }
      }

      # HTML sin cache (para ver siempre la ultima version);
      # el resto con cache para que navegar sea rapido.
      $cache = if ($ext -eq '.html' -or $ext -eq '.htm') { 'no-cache' } else { 'public, max-age=3600' }

      if ($partial) {
        $count = $end - $start + 1
        $head = "HTTP/1.1 206 Partial Content`r`nContent-Type: $contentType`r`nContent-Length: $count`r`n" +
                "Content-Range: bytes $start-$end/$fileLength`r`nAccept-Ranges: bytes`r`nCache-Control: $cache`r`nConnection: close`r`n`r`n"
        $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
        $stream.Write($headBytes, 0, $headBytes.Length)
        $fs = [System.IO.File]::OpenRead($full)
        $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
        $remaining = $count
        $chunk = New-Object byte[] 65536
        while ($remaining -gt 0) {
          $want = [Math]::Min($chunk.Length, $remaining)
          $got = $fs.Read($chunk, 0, $want)
          if ($got -le 0) { break }
          $stream.Write($chunk, 0, $got)
          $remaining -= $got
        }
        $fs.Close()
      } else {
        $head = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $fileLength`r`n" +
                "Accept-Ranges: bytes`r`nCache-Control: $cache`r`nConnection: close`r`n`r`n"
        $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
        $stream.Write($headBytes, 0, $headBytes.Length)
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $stream.Write($bytes, 0, $bytes.Length)
      }
      $stream.Flush()
      $client.Close()
    } catch {
      try { $client.Close() } catch { }
    }
  }
} finally {
  $listener.Stop()
  Write-Output "Servidor detenido."
}

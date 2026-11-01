param([switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
$engineRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$dependencyRoot = [IO.Path]::GetFullPath((Join-Path $engineRoot '.deps'))
$checkout = Join-Path $dependencyRoot 'vcpkg'
$baseline = '9a5dfef5d1a0438a7d24856a85bd60f309d355e9'
$official = 'https://github.com/microsoft/vcpkg.git'
if (-not $checkout.StartsWith($engineRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Dependency directory is outside engine workspace.' }
$manifest = Get-Content -LiteralPath (Join-Path $engineRoot 'vcpkg.json') -Raw | ConvertFrom-Json
if ($manifest.'builtin-baseline' -ne $baseline -or @($manifest.overrides | Where-Object { $_.name -eq 'protobuf' -and $_.version -eq '6.33.6' }).Count -ne 1) { throw 'Engine dependency pins conflict with the approved baseline/runtime.' }
if (-not (Test-Path -LiteralPath $checkout)) {
  if ($VerifyOnly) { throw 'Pinned vcpkg checkout has not been prepared.' }
  New-Item -ItemType Directory -Path $dependencyRoot -Force | Out-Null
  & git clone --no-checkout --filter=blob:none $official $checkout
  if ($LASTEXITCODE -ne 0) { throw 'Official vcpkg clone failed.' }
  & git -C $checkout fetch --depth 1 origin $baseline
  if ($LASTEXITCODE -ne 0) { throw 'Pinned vcpkg fetch failed.' }
  & git -C $checkout checkout --detach $baseline
  if ($LASTEXITCODE -ne 0) { throw 'Pinned vcpkg checkout failed.' }
}
$origin = & git -C $checkout remote get-url origin
$actual = & git -C $checkout rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actual.Trim() -ne $baseline -or $origin.Trim() -ne $official) { throw 'Existing vcpkg checkout conflicts with the approved official pin; no reset/update attempted.' }
$dirty = & git -C $checkout status --porcelain --untracked-files=no
if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Pinned vcpkg tracked files are modified.' }
$overlayRoot = Join-Path $engineRoot 'vcpkg-ports/protobuf'
$port = Get-Content -LiteralPath (Join-Path $overlayRoot 'vcpkg.json') -Raw | ConvertFrom-Json
if ($port.version -ne '6.33.6' -or [int]$port.'port-version' -ne 0) { throw 'Overlay protobuf metadata must report6.33.6 revision0.' }
$recipe = Get-Content -LiteralPath (Join-Path $overlayRoot 'portfile.cmake') -Raw
if ($recipe -notmatch '(?m)^\s*REF "6e1998413a5bca7c058b85999667893f167434bc"\s*$' -or $recipe -notmatch 'SHA512 7C5D20F269E21AEB98654A085A6B5EB9AE60C4AB114250150675BA65011C38A488C0F633160CDE32CB64B5B246E85618153FDC466BB7BC51F21F060D3D5788E0' -or $recipe -match 'HEAD_REF') { throw 'Overlay source pin/hash conflicts with the approved immutable33.6 source.' }
foreach ($patch in @('fix-static-build.patch','fix-default-proto-file-path.patch','fix-utf8-range.patch','fix-install-dirs.patch','fix-upb.patch')) {
  if (-not (Test-Path -LiteralPath (Join-Path $overlayRoot $patch))) { throw "Approved packaging patch missing: $patch" }
}
if (Test-Path -LiteralPath (Join-Path $overlayRoot 'fix-constinit-with-clang-cl.patch')) { throw 'Unselected clang-cl source patch in the native-MSVC overlay.' }
$tool = Join-Path $checkout 'vcpkg.exe'
if (-not (Test-Path -LiteralPath $tool)) {
  if ($VerifyOnly) { throw 'Pinned vcpkg executable is missing.' }
  & (Join-Path $checkout 'bootstrap-vcpkg.bat') -disableMetrics
  if ($LASTEXITCODE -ne 0) { throw 'Pinned vcpkg bootstrap failed.' }
}
$metadata = Get-Content -LiteralPath (Join-Path $checkout 'scripts/vcpkg-tool-metadata.txt') -Raw
$release = [regex]::Match($metadata, '(?m)^VCPKG_TOOL_RELEASE_TAG=([^\r\n]+)').Groups[1].Value
$signature = Get-AuthenticodeSignature -LiteralPath $tool
$toolVersion = (& $tool version) -join "`n"
if ($LASTEXITCODE -ne 0 -or -not $release -or $signature.Status -ne 'Valid' -or $toolVersion -notmatch ('version ' + [regex]::Escape($release) + '-')) { throw "vcpkg pinned verification failed: signature=$($signature.Status) ($($signature.StatusMessage)); expected release=$release; actual=$toolVersion" }
foreach ($profile in @('release','asan')) {
  $triplet = if ($profile -eq 'asan') { 'x64-windows-cxx20-asan' } else { 'x64-windows-cxx20' }
  $installedRoot = Join-Path $dependencyRoot "vcpkg_installed_33_$profile"
  $protoc = Join-Path $installedRoot 'x64-windows-cxx20/tools/protobuf/protoc.exe'
  if (Test-Path -LiteralPath $protoc) {
    $version = & $protoc --version
    if ($LASTEXITCODE -ne 0 -or $version.Trim() -ne 'libprotoc 33.6') { throw "Selected $profile host protoc conflicts with33.6." }
  } elseif ($VerifyOnly) { throw "Selected $profile host protoc has not been built." }
  $runtimeCache = Join-Path $dependencyRoot "vcpkg_buildtrees_33_$profile/protobuf/$triplet-rel/CMakeCache.txt"
  if (Test-Path -LiteralPath $runtimeCache) {
    if (-not (Select-String -LiteralPath $runtimeCache -Pattern '^CMAKE_CXX_STANDARD(:[^=]*)?=20$' -Quiet) -or (Select-String -LiteralPath $runtimeCache -Pattern 'PROTOBUF_MESSAGE_GLOBALS_TEMPORARY_OPTOUT' -Quiet)) { throw "Selected $profile runtime cache conflicts with the C++20 ABI." }
    if ($profile -eq 'asan' -and -not (Select-String -LiteralPath $runtimeCache -Pattern '^CMAKE_CXX_FLAGS:STRING=.*fsanitize=address' -Quiet)) { throw 'Selected ASan runtime cache lacks instrumentation.' }
  }
}
Write-Output 'Pinned official vcpkg/bootstrap and immutable protobuf6.33.6 overlay verified; matching protoc33.6 is supplied by the selected manifest builds.'

@echo off
rem 《实验室安全官》Windows 启动器
rem 双击本文件即可在默认浏览器中运行游戏。
rem 游戏为单文件网页程序，无需安装、无需联网。

set "GAME=%~dp0实验室安全官.html"

if not exist "%GAME%" (
    echo.
    echo   未找到游戏文件：实验室安全官.html
    echo   请确认本启动器与 HTML 文件位于同一目录。
    echo.
    pause
    exit /b 1
)

rem优先使用 Edge（Windows 10/11 自带，兼容性最好），失败则回退到默认浏览器
where msedge.exe >nul 2>nul
if %errorlevel%==0 (
    start "" "msedge.exe" --new-window "file:///%GAME:\=/%"
) else (
    start "" "%GAME%"
)

exit /b 0

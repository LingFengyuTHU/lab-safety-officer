; IExpress 打包配置：用单文件 HTML 生成 Windows 自解压可执行程序
;
; 原理：将 01_可执行文件/实验室安全官.html 压入自解压壳，
; 双击 exe 后自动释放到临时目录并用默认浏览器打开。
; 该exe 不安装任何东西，不写注册表，退出后不留痕迹（临时目录由系统清理）。
;
; 打包命令：iexpress /N build\package.sed
;
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
AppLaunched=实验室安全官.html
AppLaunched_32bit=实验室安全官.html
QuietInstallCmd=
QuietInstallCmd_32bit=
DisplayLicense=1033
FinishMessage=已打开《实验室安全官》。本程序不含安装功能，直接在浏览器中运行。&如果未自动打开，请双击同目录下的 实验室安全官.html。&按任意键关闭此窗口。
PostInstallCmd=<POSTINSTALL>
AdminQuietInstCmd=管理员模式
UserQuietInstCmd=普通用户模式
SourceFiles=SourceFiles

[SourceFiles]
SourceFiles0=..\01_可执行文件\实验室安全官.html

[SourceFiles0]
%FILE0%=%FILE0%

[DestinationFiles]
DestinationFiles0=%TEMP%\实验室安全官.html

[Strings]
FILE0=实验室安全官.html
POSTINSTALL=
EXECUTABLE=..\01_可执行文件\实验室安全官.exe

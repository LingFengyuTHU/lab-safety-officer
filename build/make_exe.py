# -*- coding: utf-8 -*-
"""
生成 Windows 自解压可执行程序（单文件 exe）。

做法：把单文件 HTML 与启动批处理打成一个 zip，再在前面拼接
WinRAR 的 Default.SFX 壳。SFX 壳执行后自动解压到临时目录，
再运行其中的启动脚本。双击 exe 即可在浏览器中打开游戏。

前置条件：WinRAR 安装目录存在 Default.SFX（32位壳，兼容性最好）。
若不存在，脚本会提示改用 HTML 直接提交。
"""
import io
import os
import shutil
import sys
import zipfile

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
EXE_DIR = os.path.join(ROOT, '01_可执行文件')
HTML = os.path.join(EXE_DIR, '实验室安全官.html')
BAT = os.path.join(EXE_DIR, '启动游戏.bat')
SFX_CANDIDATES = [
    r'C:\Program Files\WinRAR\Default.SFX',
    r'C:\Program Files (x86)\WinRAR\Default.SFX',
    r'C:\Program Files\WinRAR\WinCon.SFX',
]
OUT_EXE = os.path.join(EXE_DIR, '实验室安全官.exe')
TMP_ZIP = os.path.join(BASE, '_sfx_payload.zip')


def find_sfx():
    for p in SFX_CANDIDATES:
        if os.path.isfile(p):
            return p
    return None


def main():
    if not os.path.isfile(HTML):
        print('[fail] 未找到单文件 HTML：%s' % HTML)
        print('       请先运行 build/build_single.py')
        return 1

    sfx = find_sfx()
    if not sfx:
        print('[warn] 未找到 WinRAR 的 Default.SFX，无法生成 exe。')
        print('       备选方案：直接提交 实验室安全官.html，双击即可在浏览器运行。')
        return 0

    for f in (HTML, BAT):
        if not os.path.isfile(f):
            print('[fail] 缺少文件：%s' % os.path.basename(f))
            return 1

    # 1. 打包 payload。用 ZIP_DEFLATED，浏览器与 Windows 均可解。
    with zipfile.ZipFile(TMP_ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(HTML, '实验室安全官.html')
        z.write(BAT, '启动游戏.bat')

    zip_size = os.path.getsize(TMP_ZIP)
    sfx_size = os.path.getsize(sfx)

    # 2. 拼接：SFX 壳 + zip 载荷。SFX 壳按EOCD 定位载荷，无需对齐。
    with open(OUT_EXE, 'wb') as out:
        with open(sfx, 'rb') as f:
            shutil.copyfileobj(f, out)
        with open(TMP_ZIP, 'rb') as f:
            shutil.copyfileobj(f, out)

    os.remove(TMP_ZIP)

    total = os.path.getsize(OUT_EXE)
    print('[ok] 已生成：%s' % OUT_EXE)
    print('SFX 壳 %.0f KB + 载荷 %.0f KB = %.0f KB' %
          (sfx_size / 1024, zip_size / 1024, total / 1024))
    print('载荷内含：实验室安全官.html、启动游戏.bat')
    print('双击该 exe 会自动解压到临时目录并用默认浏览器打开游戏，')
    print('不写注册表、不安装文件，关闭后临时目录由系统清理。')
    return 0


if __name__ == '__main__':
    sys.exit(main())

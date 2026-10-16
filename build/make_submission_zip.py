# -*- coding: utf-8 -*-
"""
生成提交用的压缩包。

包含比赛要求的五类材料：可执行文件、源代码、资源文件、配置文件、说明文档。
排除版本库、制作原稿、测试截图等非提交内容。

用法：
    python build/make_submission_zip.py          生成完整版（含 PNG 原稿）
    python build/make_submission_zip.py --slim   生成精简版（只含 WebP 成品）
    python build/make_submission_zip.py --all    两个都生成
"""
import os
import re
import sys
import zipfile

ROOT = r'F:\WorkBuddy_data\lab_safety_knowledge_competition\作品_实验室安全官'
OUT_DIR = r'F:\WorkBuddy_data\lab_safety_knowledge_competition'
TOP = '实验室安全官'

# 顶层目录：版本库与生成图原稿不进提交包
EXCLUDE_DIRS = {'.git', '06_制作原稿'}
# 单文件排除：1.0 旧版设计文档、git 配置
EXCLUDE_FILES = {'.gitignore', '00_设计方案.md', 'Thumbs.db', 'desktop.ini'}
# 相对路径前缀排除：测试截图
EXCLUDE_PREFIX = {os.path.join('build', 'shots')}
# 精简版额外排除：PNG 原稿（21 MB）
SLIM_PREFIX = {os.path.join('03_资源文件', 'images')}


def make_skip(slim):
    def skip(rel):
        parts = rel.split(os.sep)
        if parts[0] in EXCLUDE_DIRS:
            return True
        if rel in EXCLUDE_FILES:
            return True
        for pre in EXCLUDE_PREFIX:
            if rel == pre or rel.startswith(pre + os.sep):
                return True
        if slim:
            for pre in SLIM_PREFIX:
                if rel == pre or rel.startswith(pre + os.sep):
                    return True
        if len(parts) > 1 and parts[1] == 'shots':
            return True
        if parts[-1].endswith(('.bak', '.pyc')):
            return True
        return False
    return skip


def build(slim):
    skip = make_skip(slim)
    suffix = '_精简版' if slim else ''
    out = os.path.join(OUT_DIR, '实验室安全官_参赛作品%s.zip' % suffix)
    if os.path.exists(out):
        os.remove(out)

    entries = []
    total_raw = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            for fn in filenames:
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, ROOT)
                if skip(rel):
                    continue
                arc = TOP + '/' + rel.replace(os.sep, '/')
                z.write(full, arc)
                entries.append((arc, os.path.getsize(full)))
                total_raw += os.path.getsize(full)

    zip_size = os.path.getsize(out)

    # 完整性校验
    with zipfile.ZipFile(out) as z:
        bad = z.testzip()
        html = z.read(TOP + '/01_可执行文件/实验室安全官.html').decode('utf-8')
        exe = z.read(TOP + '/01_可执行文件/实验室安全官.exe')
    lv = html.count("image: 'lv")
    kp = len(set(re.findall(r'L[1-6]_[a-z_0-9]+', html)))

    print('[ok] %s' % out)
    print('     文件 %d 个，原始 %.1f MB，压缩后 %.1f MB'
          % (len(entries), total_raw / 1048576, zip_size / 1048576))
    print('     完整性：%s｜单文件关卡 %d｜知识点 %d｜exe %d KB'
          % ('正常' if bad is None else '损坏于 ' + str(bad), lv, kp, len(exe) // 1024))

    # 关键文件校验
    need = [
        '01_可执行文件/实验室安全官.html',
        '01_可执行文件/实验室安全官.exe',
        '01_可执行文件/启动游戏.bat',
        '02_源代码/src/data/knowledge.js',
        '02_源代码/src/js/game.js',
        '02_源代码/src/css/style.css',
        '02_源代码/src/index.html',
        '04_配置文件/levels.json',
        '05_说明文档/知识点与规范依据清单.md',
        '05_说明文档/作品说明.md',
        '05_说明文档/作品简介.md',
        '05_说明文档/运行说明.md',
        '00_提交说明.md',
        'README.md',
    ]
    names = set(a for a, _ in entries)
    miss = [n for n in need if TOP + '/' + n not in names]
    if miss:
        print('     [缺失] ' + '、'.join(miss))
    else:
        print('     关键文件 %d 项齐全' % len(need))
    print()
    return (bad is None and not miss and lv == 6 and kp == 65)


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    if arg == '--all':
        a = build(False)
        b = build(True)
        print('两个版本均已生成。建议：提交系统有体积限制时用精简版，否则用完整版。')
        return 0 if (a and b) else 1
    return 0 if build(arg == '--slim') else 1


if __name__ == '__main__':
    raise SystemExit(main())

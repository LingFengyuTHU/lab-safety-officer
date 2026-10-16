# -*- coding: utf-8 -*-
"""
同步资源目录：把 src/assets 下的 WebP 插画复制到 03_资源文件/images_webp。

背景：03_资源文件/images_webp 曾停留在 1.0 版本，缺少第 3、6 关插画。
本脚本以 src/assets 为唯一可信来源，两个目录保持一致。
"""
import io
import os
import shutil
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
SRC_ASSETS = os.path.join(ROOT, '02_源代码', 'src', 'assets')
DST_IMAGES = os.path.join(ROOT, '03_资源文件', 'images')
DST_WEBP = os.path.join(ROOT, '03_资源文件', 'images_webp')

EXPECTED = [
    'cover_lab', 'ending_pass',
    'lv1_chemical', 'lv2_waste', 'lv3_reaction', 'lv3_fire',
    'lv4_electric_fire', 'lv4_fire', 'lv4_cylinder',
    'lv5_highpressure', 'lv5_cylinder', 'lv5_emergency',
    'lv6_emergency',
]


def main():
    if not os.path.isdir(SRC_ASSETS):
        print('[fail] 未找到资源目录：%s' % SRC_ASSETS)
        return 1
    if not os.path.isdir(DST_WEBP):
        os.makedirs(DST_WEBP)

    webps = sorted(f for f in os.listdir(SRC_ASSETS) if f.lower().endswith('.webp'))
    if not webps:
        print('[fail] src/assets 下没有 webp 文件')
        return 1

    # 1. 清理目标目录中不在源目录里的旧文件
    removed = []
    for f in os.listdir(DST_WEBP):
        if f.lower().endswith('.webp') and f not in webps:
            os.remove(os.path.join(DST_WEBP, f))
            removed.append(f)

    # 2. 复制
    copied = 0
    for f in webps:
        s = os.path.join(SRC_ASSETS, f)
        d = os.path.join(DST_WEBP, f)
        if not os.path.isfile(d) or os.path.getsize(s) != os.path.getsize(d):
            shutil.copy2(s, d)
            copied += 1

    # 3. 检查 src/assets 里的非 webp 残留（生成图原稿）
    strays = [f for f in os.listdir(SRC_ASSETS) if not f.lower().endswith('.webp')]

    print('[ok] images_webp 已同步，共 %d 张WebP' % len(webps))
    if copied:
        print('     新增或更新 %d 张' % copied)
    if removed:
        print('     移除过期 %d 张：%s' % (len(removed), '、'.join(removed)))
    if strays:
        print('[warn] src/assets 存在非 webp 文件 %d 个：' % len(strays))
        for f in strays:
            print('        %s' % f)
        print('       这些是生成图原稿，不应打包进提交物，建议移出。')

    # 4. 报告
    total = sum(os.path.getsize(os.path.join(DST_WEBP, f)) for f in os.listdir(DST_WEBP))
    print('     images_webp 总体积 %.0f KB' % (total / 1024))
    if os.path.isdir(DST_IMAGES):
        n = len([f for f in os.listdir(DST_IMAGES) if f.lower().endswith('.png')])
        sz = sum(os.path.getsize(os.path.join(DST_IMAGES, f)) for f in os.listdir(DST_IMAGES))
        print('     images（PNG 原稿，%d 张）总体积 %.0f KB' % (n, sz / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())

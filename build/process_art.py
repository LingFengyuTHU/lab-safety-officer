#!/usr/bin/env python3
"""
将新生成的插画裁掉底部水印条、缩放并压缩为 WebP。
水印位于右下角，裁掉底部 6% 即可干净移除，不影响主体构图。
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
NEWDIR = ROOT / "02" / "assets_new"
ASSETS = ROOT / "02_源代码" / "src" / "assets"
RAW = ROOT / "03_资源文件" / "images"

# 源文件名前缀 -> 目标名
MAPPING = {
    "清爽现代的科学实验室场景": "cover_lab",
    "一个实验室化学品储存柜场景": "lv1_chemical",
    "实验室危险废物收集区场景": "lv2_waste",
    "实验台上的一次化学反应演示场景": "lv3_reaction",
    "实验室消防应急场景": "lv4_fire",
    "实验室高压气瓶存放区场景": "lv5_cylinder",
    "实验室突发事故应急处置场景": "lv6_emergency",
    "实验室安全知识通关后的庆祝场景": "ending_pass",
}


def find_source():
    """收集所有待处理的源 png（assets_new + src/assets 下新生成的封面）"""
    found = {}
    for d in (NEWDIR, ASSETS):
        if not d.exists():
            continue
        for p in d.glob("*.png"):
            for key, name in MAPPING.items():
                if key in p.name and name not in found:
                    found[name] = p
    return found


def process(src: pathlib.Path, name: str) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size

    # 裁掉底部 7%：移除"AI生成"水印带
    crop_h = int(h * 0.93)
    im = im.crop((0, 0, w, crop_h))

    # 等比缩放到长边 1280，控制体积
    target_w = 1280
    if im.width > target_w:
        nh = int(im.height * target_w / im.width)
        im = im.resize((target_w, nh), Image.LANCZOS)

    ASSETS.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)

    im.save(RAW / f"{name}.png", optimize=True)
    im.save(ASSETS / f"{name}.webp", "WEBP", quality=82, method=6)
    kb = (ASSETS / f"{name}.webp").stat().st_size / 1024
    print(f"  {name}.webp  {im.width}x{im.height}  {kb:.0f} KB")


def main() -> int:
    found = find_source()
    missing = [n for n in MAPPING.values() if n not in found]
    if missing:
        print("[error] 未找到源图:", missing)
        return 1
    print("[ok] 开始处理插画：")
    for name in MAPPING.values():
        process(found[name], name)
    total = sum((ASSETS / f"{n}.webp").stat().st_size for n in MAPPING.values())
    print(f"[ok] 合计 {total/1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
修正两处数据问题：

1. L4_burn / L4_eye（化学灼伤与眼部冲洗的急救）内容上属于"应急处置"，
   但原文件把它们放在"用电与消防"段落下，导致知识点编号与关卡编号不一致。
   本脚本把这两条物理移动到第 6 关段落，并重命名为 L6_burn / L6_eye。

2. 同步更新所有引用点（LEVELS 第 6 关的 items）。
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "02_源代码" / "src" / "data" / "knowledge.js"

MOVES = [("L4_burn", "L6_burn"), ("L4_eye", "L6_eye")]


def main() -> int:
    text = TARGET.read_text(encoding="utf-8")

    # 关卡编号已由 5 关调整为 6 关，同步修正遗留的段落标题编号
    text = text.replace("/* ========== 第 4 关 · 高压高温与气瓶 ========== */",
                        "/* ========== 第 5 关 · 高压高温与气瓶 ========== */", 1)
    text = text.replace("/* ========== 第 5 关 · 应急处置 ========== */",
                        "/* ========== 第 6 关 · 应急处置 ========== */", 1)

    for old, new in MOVES:
        # 取出整块（含尾随逗号）
        m = re.search(r"  " + re.escape(old) + r": \{.*?\n  \},\n\n", text, re.S)
        if not m:
            print(f"[error] 未找到知识块 {old}")
            return 1
        block = m.group(0)
        text = text[:m.start()] + text[m.end():]

        # 重命名 key
        block = block.replace(f"  {old}: {{", f"  {new}: {{", 1)

        # 插入到第 6 关段落的第一条之前（L6_leak）
        anchor = "  L6_leak: {"
        if anchor not in text:
            print("[error] 未找到 L6_leak 锚点")
            return 1
        text = text.replace(anchor, block + anchor, 1)

        # 更新引用
        text = text.replace(f"k: '{old}'", f"k: '{new}'")

    TARGET.write_text(text, encoding="utf-8")
    print(f"[ok] 已移动并重命名 {len(MOVES)} 条知识点：")
    for old, new in MOVES:
        print(f"     {old} → {new}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

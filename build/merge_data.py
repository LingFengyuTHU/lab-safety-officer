#!/usr/bin/env python3
"""
把 levels.js 合并进 knowledge.js，产出运行时唯一的数据文件。

knowledge.js 前半部分是 KNOWLEDGE 条目，后半部分是关卡与衍生数据集。
两者需要手工同步维护（改条目时不改关卡、改关卡时不改条目），
这个脚本保证最终产物里两半始终一致。

用法：python build/merge_data.py
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "02_源代码" / "src" / "data"
TARGET = DATA / "knowledge.js"
LEVELS = DATA / "levels.js"

MARKER = "/* 关卡配置 */"


def main() -> int:
    text = TARGET.read_text(encoding="utf-8")
    idx = text.find(MARKER)
    if idx < 0:
        print(f"[error] 未找到分隔标记：{MARKER}")
        return 1

    head = text[:idx] + "/* 关卡配置 */\n"
    tail = LEVELS.read_text(encoding="utf-8")

    TARGET.write_text(head + tail, encoding="utf-8")
    n = TARGET.read_text(encoding="utf-8").count("\n  L")
    print(f"[ok] 已合并 levels.js，知识点 {n} 条，总行数 {TARGET.read_text(encoding='utf-8').count(chr(10)) + 1}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

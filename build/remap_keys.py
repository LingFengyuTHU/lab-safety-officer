#!/usr/bin/env python3
"""
关卡结构调整：把用电消防/气瓶/应急三类知识点重新编号，
使其与新的 6 关顺序一致，并为第 3 关（配伍禁忌实验）腾出 L3_ 命名空间。

映射：原 L3(用电消防) -> L4；原 L4(气瓶) -> L5；原 L5(应急) -> L6
注意：必须按 3->6, 4->5, 5->6 的顺序反向处理，避免链式覆盖。
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "02_源代码" / "src" / "data" / "knowledge.js"

def main() -> int:
    text = TARGET.read_text(encoding="utf-8")
    original = text

    # 反向顺序：5->6, 4->5, 3->4，避免链式冲突
    for old, new in ((5, 6), (4, 5), (3, 4)):
        text = re.sub(rf"\bL{old}_", f"L{new}_", text)

    if text == original:
        print("[warn] 未发生任何替换")
        return 1

    TARGET.write_text(text, encoding="utf-8")
    print("[ok] 知识点编号重映射完成：L3->L4, L4->L5, L5->L6")
    return 0


if __name__ == "__main__":
    sys.exit(main())

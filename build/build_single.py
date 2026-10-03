#!/usr/bin/env python3
"""
将 src/ 下分离的源码打包为单文件 HTML。
- 内联 CSS 与 JS
- 图片转为 base64 data URI
输出：01_可执行文件/实验室安全官.html
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "02_源代码" / "src"
OUT_DIR = ROOT / "01_可执行文件"
OUT_FILE = OUT_DIR / "实验室安全官.html"


def read(p: pathlib.Path) -> str:
    return p.read_text(encoding="utf-8")


def build():
    html = read(SRC / "index.html")
    css = read(SRC / "css" / "style.css")
    knowledge = read(SRC / "data" / "knowledge.js")
    game = read(SRC / "js" / "game.js")

    # 内联样式
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        "<style>\n" + css + "\n</style>",
    )

    # 内联脚本
    html = html.replace(
        '<script src="data/knowledge.js"></script>\n<script src="js/game.js"></script>',
        "<script>\n" + knowledge + "\n</script>\n<script>\n" + game + "\n</script>",
    )

    # 图片转 data URI：把 IMG_BASE 机制替换为内联映射
    assets_dir = SRC / "assets"
    data_map = {}
    for img in sorted(assets_dir.glob("*.webp")):
        b64 = base64.b64encode(img.read_bytes()).decode("ascii")
        data_map[img.name] = "data:image/webp;base64," + b64

    # 覆盖 JS 中的 IMG_BASE，改为查表
    js_map = "var ASSET_DATA = " + repr(data_map).replace("'", '"') + ";\n"
    html = html.replace(
        "var IMG_BASE = 'assets/';",
        js_map + """
  var IMG_BASE = '';
  function assetUrl(name){ return ASSET_DATA[name] || name; }
  (function(){
    var _qs = document.querySelector.bind(document);
  })();
""",
    )

    # 把 src 拼接处统一改走 assetUrl
    html = html.replace("img.src = IMG_BASE + curLevel().image;",
                        "img.src = assetUrl(curLevel().image);")
    html = html.replace("$('coverImg').src = IMG_BASE + 'cover_lab.webp';",
                        "$('coverImg').src = assetUrl('cover_lab.webp');")
    html = html.replace("img.src = IMG_BASE + 'ending_pass.webp';",
                        "img.src = assetUrl('ending_pass.webp');")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(html, encoding="utf-8")

    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"[ok] 已生成单文件: {OUT_FILE}")
    print(f"     体积: {size_kb:.0f} KB")

    # 自检：确认没有残留外部引用
    leftover = re.findall(r'(?:src|href)="(?!data:|#|https?://)[^"]+"', html)
    if leftover:
        print("[warn] 发现未内联的引用:", leftover)
        return 1
    print("[ok] 自检通过：无外部文件依赖，可离线双击运行")
    return 0


if __name__ == "__main__":
    sys.exit(build())

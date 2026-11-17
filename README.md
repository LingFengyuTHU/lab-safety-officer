# 实验室安全官 · 异常实验夜

开发者：聆风语。玩法灵感参考 Brotato，像素美术方向参考 Stardew Valley。

俯视角自动战斗游戏：穿越物理、化学、生物三座实验室，完成十二波挑战，通过拾取研究点和安全知识答题强化装备。包含八种武器、十六种模块、72 道题与原创八比特音乐《微光值夜》。后期升级费用逐波提高，三个实验室采用不同配色和布局。

## 在线游玩

[打开游戏](https://lingfengyuthu.github.io/lab-safety-officer/)

## 直接运行

使用现代 Chrome 或 Edge 打开 **实验室安全官_单文件版.html**，无需安装、启动服务或联网加载资源。index.html 与它内容完全相同，也可直接打开。

程序、八张图集、题库与音乐乐谱均已内嵌。背景音乐由浏览器合成，首次点击开始或设置后播放，不需要旁边的 WAV。题目出处链接需联网访问，但不影响离线游玩。

- WASD / 方向键移动，武器自动瞄准攻击；ESC 暂停。
- 靠近光球收集研究点，休整时答题购买强化。
- 第 4、8 波精英可选击杀，第 12 波必须击败首领。
- 首页可查看题库、练习和调整音乐、音效及新局难度。
- 休整进度自动保存；开战后清除该休整存档。战斗中关闭页面会丢失本局。

设置、错题和休整存档保存在浏览器本机；不同浏览器、本地文件与线上网址之间不共享，浏览器限制存储时可能无法保存。推荐电脑键盘与较宽窗口。单文件已完成资源内嵌检查，独立浏览器 file:// 离线兼容性尚未专门实测。

## 文件说明

```
index.html                       GitHub Pages 首页，同时也是单文件游戏
实验室安全官_单文件版.html         便于离线分发的同内容副本
.nojekyll                        静态发布标记
assets/art/                      最终采用的八张原始像素图集
assets/audio/                    原创配乐 WAV 试听与乐谱
src/                             可编辑的完整游戏源码与构建脚本
docs/                            题库出处与素材生成记录
package.json                     本地构建命令（无第三方依赖）
README.md                        本说明
```

assets 是保留的最终素材，方便后续维护与单独使用；运行 HTML 时不依赖这些外置文件。此目录没有试玩版、测试页、验收截图、开发快照或旧版本压缩包。源码、题库、素材和构建工具均已包含，下载本仓库即可继续开发，不需要原开发目录。

## 继续开发

安装 Node.js 18 或以上版本，在本仓库根目录运行：

```sh
npm run build
```

也可以直接运行 `node src/build.mjs`。没有第三方依赖，无需先执行 npm install。构建会读取 src 与 assets/art，覆盖根目录的 index.html 和 实验室安全官_单文件版.html；两份输出内容一致。修改源码后重新构建，再用浏览器打开输出 HTML 即可查看。不要直接修改生成的 HTML，否则下次构建会覆盖改动。将源码、素材和重新生成的 HTML 一起提交，GitHub Pages 就能展示最新版本。

| 文件 | 维护内容 |
| --- | --- |
| src/index.template.html | 页面结构与资源嵌入位置 |
| src/style.css | 首页、设置、题库、休整等界面的样式 |
| src/world.js | 武器、敌人、地图、布局与波次时长配置 |
| src/core.js | 战斗、掉落、升级、商店价格等核心规则 |
| src/app.js | 绘制、操作、界面流程与浏览器存档 |
| src/questions.js | 全部 72 道题、答案、解析和出处 |
| src/audio.js | 八比特音乐乐谱、音效与浏览器合成逻辑 |
| src/build.mjs | 把上述文件和八张图集打包成单文件 HTML |

### 修改题库

编辑 src/questions.js 中的 `window.LAB_QUESTIONS` 数组。每道题使用唯一 id，包含 tag（分类）、q（题干）、options（选项数组）、answer（正确选项下标）、why（解析）、sourceTitle 与 sourceUrl（出处）。**answer 从 0 开始**：0 对应第一个选项，1 对应第二个，以此类推。

现有分类为 electric（用电）、general（通用）、fire（消防）、chemical（化学）、bio（生物）。增加题目时沿用这些分类，并提供可核查的出处。来源说明位于 docs/03_试作题库来源.md 与 docs/04_完整题库来源.md；前者记录最初纳入的题目，后者记录扩展部分，均属于当前完整题库的资料。源码注释中的旧设计文档路径对应这里的同名文件。

### 修改素材与音乐

八张图集位于 assets/art。替换时保持图集尺寸和帧布局，否则还需同步修改 src/app.js 中对应的取图与绘制逻辑。新增图集还需修改 src/build.mjs 的资源映射。docs 下的两份素材生成记录保留制作提示词，记录中的历史路径仅用于追溯，不参与构建。

游戏实际播放的音乐由 src/audio.js 合成；assets/audio 中的 WAV 是独立试听文件，JSON 是乐谱资料。仅替换 WAV 或 JSON 不会改变游戏内音乐，应同步修改 src/audio.js，再重新构建。

## 部署到 GitHub Pages

1. 建立 GitHub 仓库，将**本文件夹里面的内容**上传到仓库根目录，让 index.html 直接位于根目录；不要仅上传一个外层“最终作品”文件夹。
2. 打开仓库 Settings → Pages，在 Build and deployment 中选择 Deploy from a branch。
3. 选择存放文件的分支（通常为 main）和 /(root)，保存。
4. 等待 GitHub 完成发布，通过 Pages 页面提供的网址访问游戏。

部署已经生成的 HTML 不需要 Node.js、依赖安装或在线构建。最小上线只需 index.html 和 .nojekyll；为了让别人继续开发，建议上传本文件夹全部内容。中文命名的 HTML 是可选离线副本。

部署步骤依据 [GitHub Pages 发布来源说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) 和 [入口文件说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。发布来源为 main 分支根目录。

## 内容与素材

图集为本项目生成的原创设计，没有使用参考游戏的原始素材；《微光值夜》使用原创乐谱，无外部音乐采样。安全题答案后附公开资料出处。器材战斗属于虚构模拟，真实实验应遵循实际操作规程。

本目录未附开源许可证；发布到公开仓库前可根据作者意愿另行选择代码和素材的许可方式。

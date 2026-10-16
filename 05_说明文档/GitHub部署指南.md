# GitHub Pages 部署指南

本文件说明如何把《实验室安全官》发布为在线演示，便于评委会直接访问体验。

---

## 一、部署结构

采用 main 分支加 `docs/` 目录的方式。这是 GitHub Pages 最省事的配置，不需要额外的构建流程或 GitHub Actions。

仓库需要包含两个文件：

| 文件 | 作用 |
| --- | --- |
| `docs/index.html` | 部署入口，即单文件版游戏（845 KB，自包含） |
| `docs/.nojekyll` | 空文件，阻止 Jekyll 处理，避免下划线开头的目录被忽略 |

`docs/index.html` 与 `01_可执行文件/实验室安全官.html` 内容完全一致，由同一次构建产出。

---

## 二、部署步骤

### 第一步：创建仓库

在 GitHub 网页新建仓库，命名为 `lab-safety-officer`，设为 Public。GitHub Pages 免费版要求公开仓库。

初始化选项全部不勾选，保持空仓库。

### 第二步：推送代码

```bash
cd "F:/WorkBuddy_data/lab_safety_knowledge_competition/作品_实验室安全官"
git remote -v                                   # 先确认远端地址
git add -A
git commit -m "提交 2.0 版本"
git push -u origin main
```

若提示认证失败，检查 SSH key 配置：

```bash
ssh -T git@github.com
```

正常应返回 `Hi <用户名>! You've successfully authenticated...`。

### 第三步：开启 Pages

进入仓库 → Settings →左侧 Pages：

- Source 选择 `Deploy from a branch`
- Branch 选择 `main`，目录选 `/docs`
- 点击 Save

等待 1 至 2 分钟，页面会显示访问地址。

### 第四步：验证

打开生成的地址，应能直接进入游戏首页。打开浏览器开发者工具的 Console 面板，正常情况下不应有任何报错——单文件版不加载任何外部资源。

---

## 三、后续更新

改动代码后重新发布，四步：

```bash
# 1. 数据与文件自检
node build/verify.js
node build/audit_basis.js

# 2. 重新生成单文件
python build/build_single.py

# 3. 同步到部署目录
cp 01_可执行文件/实验室安全官.html docs/index.html

# 4. 提交推送
git add -A && git commit -m "更新内容说明" && git push
```

推送后 Pages 约 1 分钟内自动更新，浏览器强制刷新（Ctrl+F5）即可看到新版本。

若修改了 `data/knowledge.js` 中的知识点或关卡，还需同步两份说明文档：

```bash
node build/gen_basis_doc.js      # 依据清单
node build/gen_levels_json.js    # 关卡配置
python build/sync_assets.py      # 资源目录
python build/make_exe.py         # 重新打包 exe
```

---

## 四、常见问题

**访问显示 404**

检查 Pages 设置中的分支与目录是否为 `main` 加 `/docs`，并确认仓库是 Public。仓库名大小写会影响访问地址，注意与实际仓库名一致。

**页面能打开但游戏无反应**

按 F12 查看 Console。正常情况应无报错。若有 base64 图片过大导致的加载问题，重新执行 `python build/build_single.py` 生成。

**每次推送都要手动改什么吗**

不需要。`docs/index.html` 提交后 Pages 会自动构建部署。

**想用自定义域名**

在 Pages 设置中填入 Custom domain，然后在域名服务商处添加 CNAME 记录指向 `用户名.github.io`。国内访问 GitHub Pages 速度不稳定，若评委需要访问，建议同时提供 `01_可执行文件/` 中的离线单文件版本。

---

## 五、提交前核对

```bash
# 确认 docs 与可执行文件内容一致
node -e "const f=require('fs');
const a=f.readFileSync('docs/index.html','utf8');
console.log('关卡数:', (a.match(/image: 'lv\d/g)||[]).length);
console.log('知识点数:', new Set(a.match(/L[1-6]_[a-z_0-9]+/g)||[]).size);"
```

两个数字应分别为 6 和 65。

**说明**：本文件涉及的仓库地址、提交记录等具体信息以实际仓库为准。若尚未创建远程仓库，可跳过部署环节，直接提交 `01_可执行文件/实验室安全官.html`——该文件自包含，离线双击即可运行，评审效果与在线访问一致。

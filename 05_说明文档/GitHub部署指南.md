# GitHub Pages 部署指南

本文件说明《实验室安全官》的在线版本如何部署与更新。

---

## 一、当前状态（已部署）

| 项目 | 内容 |
| --- | --- |
| 代码仓库 | https://github.com/LingFengyuTHU/lab-safety-officer |
| 在线地址 | https://lingfengyuthu.github.io/lab-safety-officer/ |
| 部署配置 | main 分支 + `docs/` 目录 |
| 入口文件 | `docs/index.html`（与 `01_可执行文件/实验室安全官.html` 同一次构建产物） |
| 仓库可见性 | Public |

在线版本已完成验证：首页正常渲染、可进入第 1 关、12 个待归位项目与 6 个容器就位、无 JavaScript 运行错误。

**重要提示**：GitHub Pages 在国内网络环境下访问不稳定，校园网可能出现打不开或加载缓慢的情况。因此正式提交请使用离线文件（`01_可执行文件/实验室安全官.html`，双击即可运行，不依赖网络），在线地址仅作补充。

---

## 二、部署配置说明

仓库需包含两个关键文件：

| 文件 | 作用 |
| --- | --- |
| `docs/index.html` | 部署入口。内容与可执行目录下的单文件完全相同，含全部样式、脚本与插画 |
| `docs/.nojekyll` | 空文件，阻止 Jekyll 处理，避免下划线开头的目录被忽略 |

选择 `main` 分支加 `docs/` 目录的方式，不需要构建流程或 GitHub Actions，改动提交后自动生效。

---

## 三、首次部署的完整步骤

如需在其他账号或仓库重新部署，按以下步骤操作。

**第一步，创建仓库**：在 GitHub 网页新建仓库，设为 Public。初始化选项全部不勾选，保持空仓库。

**第二步，推送代码**：

```bash
cd "F:/WorkBuddy_data/lab_safety_knowledge_competition/作品_实验室安全官"
git remote -v                                   # 先确认远端地址
git add -A
git commit -m "提交内容说明"
git push -u origin main
```

若提示认证失败，检查 SSH 配置：

```bash
ssh -T git@github.com
```

正常应返回 `Hi <用户名>! You've successfully authenticated...`。

**第三步，开启 Pages**：仓库 → Settings → Pages：

- Source 选择 `Deploy from a branch`
- Branch 选择 `main`，目录选 `/docs`
- 点击 Save

也可通过接口开启（需要一个勾选 `repo` 权限的 classic token）：

```bash
curl -X POST \
  -H "Authorization: token <TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/<用户名>/<仓库名>/pages \
  -d '{"source":{"branch":"main","path":"/docs"}}'
```

返回 HTTP 201 即为成功。首次构建约需 1 至 2 分钟。

**第四步，验证**：访问生成的地址，并打开浏览器开发者工具的 Console 面板，正常情况下不应有任何报错。

---

## 四、后续更新流程

改动代码后重新发布，五步：

```bash
# 1. 数据与文件自检
node build/verify.js
node build/audit_basis.js

# 2. 重新生成单文件
python build/build_single.py

# 3. 同步到部署目录
cp 01_可执行文件/实验室安全官.html docs/index.html

# 4. 提交并推送
git add -A && git commit -m "更新内容说明" && git push

# 5. 验证线上地址是否正常
export NODE_PATH="C:/Users/lenovo/.workbuddy/binaries/node/workspace/node_modules"
node build/check_zip_playable.js "https://lingfengyuthu.github.io/lab-safety-officer/"
```

推送后 Pages 约 1 分钟内自动更新，浏览器强制刷新（Ctrl+F5）即可看到新版本。

若修改了 `data/knowledge.js` 中的知识点或关卡，还需同步派生文件：

```bash
node build/gen_basis_doc.js      # 依据清单
node build/gen_levels_json.js    # 关卡配置
python build/sync_assets.py      # 资源目录
python build/make_exe.py         # 重新打包 exe
python build/make_submission_zip.py --all   # 重新生成提交包
```

---

## 五、常见问题

**访问显示 404**

检查 Pages 设置中的分支与目录是否为 `main` 加 `/docs`，并确认仓库是 Public。仓库名大小写会影响访问地址，注意与实际仓库名一致。刚推送后需要等 1 至 2 分钟才会生效。

**页面能打开但布局异常**

按 F12 查看 Console 与 Network。若图片未加载，说明 `docs/index.html` 不是最新构建产物，重新执行 `python build/build_single.py` 并同步。

**想用自定义域名**

在 Pages 设置中填入 Custom domain，并在域名服务商处添加 CNAME 记录指向 `<用户名>.github.io`。

---

## 六、提交前核对

```bash
# 确认 docs 与可执行文件内容一致
node -e "const f=require('fs');
const a=f.readFileSync('docs/index.html','utf8');
console.log('关卡数:', (a.match(/image: 'lv\d/g)||[]).length);
console.log('知识点数:', new Set(a.match(/L[1-6]_[a-z_0-9]+/g)||[]).size);"
```

两个数字应分别为 6 和 65。

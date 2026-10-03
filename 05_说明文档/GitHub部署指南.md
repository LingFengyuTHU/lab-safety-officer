# GitHub Pages 部署指南

仓库地址：`https://github.com/LingFengyuTHU/lab-safety-officer`

部署完成后的访问地址：

```
https://lingfengyuthu.github.io/lab-safety-officer/
```

## 部署方式说明

采用 **main 分支 + docs 目录** 的方式，这是 GitHub Pages 最省事的配置，不需要额外的构建流程。

仓库里已经准备好了：

- `docs/index.html` —— 部署入口，就是单文件版游戏（415 KB，自包含）
- `docs/.nojekyll` —— 跳过 Jekyll 处理，避免文件名被改写

本地代码已经 commit 完成（commit: `448f0c7`），只差推送。

## 推送步骤

### 第一步：创建仓库

在 GitHub 网页上新建一个仓库，命名 `lab-safety-officer`，**设为 Public**（Pages 免费版要求公开仓库）。

不要勾选 "Add a README file" 等初始化选项，保持空仓库即可。

### 第二步：推送代码

```bash
cd "F:/WorkBuddy_data/lab_safety_knowledge_competition/作品_实验室安全官"
git push -u origin main
```

如果提示需要认证，说明 SSH key 没配置到这个账号。可以检查：

```bash
ssh -T git@github.com
```

正常应返回 `Hi LingFengyuTHU! You've successfully authenticated...`。

### 第三步：开启 Pages

进入仓库 → **Settings** → 左侧 **Pages**：

- **Source** 选择 `Deploy from a branch`
- **Branch** 选择 `main`，目录选 `/docs`
- 点击 **Save**

等待 1–2 分钟，刷新页面会看到绿色的访问地址。

### 第四步：验证

打开 `https://lingfengyuthu.github.io/lab-safety-officer/`，应该能直接开始游戏。

## 如果要用命令行创建仓库

需要 Personal Access Token（SSH key 无法创建仓库）：

```bash
curl -X POST -H "Authorization: token <你的TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d '{"name":"lab-safety-officer","description":"清华大学实验室安全知识大赛参赛作品：安全隐患排查小游戏","public":true}'
```

Token 需要勾选 `repo` 权限。生成地址：https://github.com/settings/tokens

## 后续更新内容

改了代码后重新发布，三步：

```bash
# 1. 重新打包单文件
python build/build_single.py

# 2. 同步到部署目录
cp 01_可执行文件/实验室安全官.html docs/index.html

# 3. 提交推送
git add -A && git commit -m "更新说明" && git push
```

推送后 Pages 会在 1 分钟左右自动更新。

## 常见问题

**页面 404？**

检查 Pages 设置里的分支和目录是否选对（`main` + `/docs`）。另外确认仓库是 Public。

**页面打开但游戏没反应？**

按 F12 看 Console 有没有报错。正常情况下不应该有任何报错——单文件版不依赖任何外部资源。

**想用自己的域名？**

在 Pages 设置里填 Custom domain，然后在域名服务商处配置 CNAME 指向 `lingfengyuthu.github.io`。

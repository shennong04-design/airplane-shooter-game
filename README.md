# 星空打飞机小游戏

这是一个纯前端 HTML5 Canvas 打飞机小游戏，可直接部署到 GitHub Pages、Vercel、Netlify 或任意静态网站托管平台。

## 文件说明

- `index.html`：网页结构
- `styles.css`：页面和游戏界面样式
- `game.js`：游戏主逻辑
- `.github/workflows/deploy.yml`：GitHub Pages 自动部署工作流

## 本地运行

直接双击 `index.html` 即可运行。  
也可以在项目目录中开启一个本地服务器：

```bash
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

## 操作方式

电脑端：

- WASD / 方向键：移动
- 空格 / 鼠标点击：射击
- P：暂停或继续

手机端：

- 拖动飞机移动
- 点击或长按屏幕射击

## 部署到 GitHub Pages

1. 新建一个 GitHub 仓库，例如 `airplane-shooter-game`
2. 上传本项目全部文件
3. 进入仓库 `Settings` → `Pages`
4. Source 选择 `GitHub Actions`
5. 推送代码后，在 `Actions` 中等待部署完成

部署完成后，访问地址通常类似：

```text
https://你的用户名.github.io/airplane-shooter-game/
```

## 功能

- 敌机随机生成
- 分数、生命、关卡、最高分
- 子弹碰撞与爆炸粒子
- 三种道具：三连发、快速射击、护盾
- 支持电脑和手机操作
- 响应式网页布局

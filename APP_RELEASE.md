# 风驰思维魔方 · 安卓端发布与构建指南

本目录下的安卓工程是基于 **Capacitor 8** 的「原生外壳」：真正的界面与逻辑都在
`src/` 的 Vue 站点里，安卓层只负责把站点装进 WebView、处理物理返回键、启动屏、
版本与更新检查。这样一套代码同时跑在浏览器（PWA）和安卓 App 里。

---

## 1. 两种打包模式

| 模式 | 行为 | 何时更新 | 适用 |
| --- | --- | --- | --- |
| `online`（在线壳） | App 直接打开线上网址 `github.io/fengchi-mofang` | 改网站即刻生效，**无需重装** | 开发期 / 频繁改动 |
| `bundled`（离线版） | 页面打包进 App 内部，断网也能打开 | 需重新出包 + 重装 | 定型后 / 对外分发 |

切换只改一行——CI 的 `mode` 入参（见第 4 节），或本地 `cap sync` 前选
`capacitor.config.json` / `capacitor.config.bundled.json`。

---

## 2. 本地构建前置（仅在你需要本机出包时）

- **JDK 17+**（本工程 AGP 8.13 / compileSdk 36，建议 JDK 21）
- **Android SDK**：`platforms;android-36` + `platform-tools` + `build-tools` 对应版本
- **Node 22** + Capacitor CLI（`npm i` 已包含）
- 已执行过 `npx cap add android`（本仓库已生成 `android/`）

本机出包命令：

```bash
npm ci
# 选模式：online 用 capacitor.config.json（已含 server.url）；bundled 用 bundled 那份
# bundled: cp capacitor.config.bundled.json capacitor.config.json
VITE_BASE=/fengchi-mofang/ npm run build      # online
# VITE_BASE=/ npm run build                    # bundled
npx cap sync android
# 准备签名密钥（见第 3 节），放到 android/release-keystore.jks
cd android
./gradlew assembleRelease        # 出 APK
./gradlew bundleRelease          # 出 AAB（上架 Play 用）
```

> 推荐直接用第 4 节的云端构建，本机零安装。

---

## 3. 生产签名密钥

上架 Google Play 或分发给其他老师，**必须用你自己的签名密钥**，不能用调试密钥
（调试密钥签的包无法覆盖安装正式包，也不能上传 Play）。

### 3.1 生成上传密钥

```bash
keytool -genkeypair -v \
  -keystore release-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias fengchi \
  -dname "CN=风驰思维魔方, OU=风驰思维, O=风驰思维, L=城市, ST=省份, C=CN"
```

记住两个口令：`store password`（密钥库口令）和 `key password`（密钥口令，可相同）。
**`release-keystore.jks` 是最高机密，请离线备份，丢失后无法更新已上架的 App。**

### 3.2 把密钥交给云端构建（GitHub Secrets）

把密钥库转成 base64，存进仓库 Secrets（仓库 `Settings → Secrets and variables → Actions`）：

```bash
base64 -w0 release-keystore.jks > keystore.b64
```

新增 4 个 **Repository secrets**：

| Secret 名 | 值 |
| --- | --- |
| `KEYSTORE_BASE64` | `keystore.b64` 的文本内容 |
| `KEYSTORE_PASSWORD` | 密钥库口令 |
| `KEY_ALIAS` | 别名（上面 `-alias` 的值，如 `fengchi`） |
| `KEY_PASSWORD` | 密钥口令 |

配置后重新跑构建，即使用你的正式密钥签名。未配置时 CI 会用临时调试密钥**仅用于验证**，
构建能过但产物不能上架。

---

## 4. 云端构建（推荐，本机零安装）

仓库是 public，GitHub Actions 免费。在仓库 `Actions → Build Android Release → Run workflow`：

- **mode**：`online` 或 `bundled`
- **buildType**：`release`（默认）或 `debug`

构建完成后：

- **APK**：发布到 Release `apk-latest`，手机点开链接直接下载安装
  - `…/releases/download/apk-latest/fengchi-mofang-online.apk`
  - `…/releases/download/apk-latest/fengchi-mofang-bundled.apk`
- **AAB**：`fengchi-mofang-*-online.aab` / `*-bundled.aab`，用于上传 Google Play
- **Actions 产物**：登录 GitHub 可在本次运行里下载（保留 90 天）

`push` 到 `main` 且改动了 `android/**`、`capacitor.config*.json` 等路径时也会自动构建。

---

## 5. 版本管理

- **显示版本** `versionName`：取自 `package.json` 的 `version`（如 `1.0.0`），改网站版本时同步改这里。
- **构建号** `versionCode`：云端构建自动用 GitHub 工作流运行号（`github.run_number`），
  保证单调递增且唯一，满足 Play 商店「versionCode 只能增不能降」的要求。
- **更新清单** `public/version.json`：构建时自动写入 `{version, build, apk}`，
  随站点部署到 `github.io/fengchi-mofang/version.json`。
  App 内 `notifyUpdateIfNeeded()` 拉取该清单，发现 `build` 更大就提示更新
  （主要服务于 bundled 离线包；online 模式 build 与清单一致不会误报）。

---

## 6. 核心原生能力（见 `src/lib/native.js`）

- `initNativeShell(router)`：接管物理返回键（有历史回退、首页才退出）+ 启动后自动检查更新。
- `getAppInfo()`：读取 App 版本 / 构建号。
- `checkAppUpdate()` / `notifyUpdateIfNeeded()`：比对远端清单，顶部弹出更新提示条。

---

## 7. 故障排查

- **安装失败「签名冲突」**：之前装过调试密钥包，需先卸载再装正式包（或反之）。
- **白屏（online 模式）**：手机连不上 `github.io`；bundled 模式不受影响。
- **启动屏被状态栏遮挡**：已用 `fitsSystemWindows` 兜底；若真机仍有问题，改 `activity_main.xml`
  或主题里的 `android:statusBarColor`。
- **R8 混淆后闪退**：在 `android/app/proguard-rules.pro` 追加对应 `-keep` 规则后重出包。

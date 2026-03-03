import type {
  OpenClawDesktopGuide,
  OpenClawInstallCatalog,
  OpenClawInstallCommand,
  OpenClawInstallMode,
  OpenClawPostInstallProfile,
} from "../types";

const DOCS_BASE_URL = "https://docs.openclaw.ai";

const catalog: OpenClawInstallCatalog = {
  categories: [
    {
      id: "official",
      label: "官方安装器",
      description: "推荐给大多数用户，一步完成 Node 检测、安装和 onboarding。",
    },
    {
      id: "manual",
      label: "手动安装",
      description: "已有 Node 环境或需要源码开发时使用。",
    },
    {
      id: "container",
      label: "容器安装",
      description: "适合隔离部署、可重复环境和服务器场景。",
    },
    {
      id: "automation",
      label: "自动化/声明式",
      description: "适合企业运维、批量部署和可回滚配置。",
    },
    {
      id: "managed",
      label: "托管平台",
      description: "一键部署到云平台，减少主机运维负担。",
    },
    {
      id: "vps",
      label: "自管云主机",
      description: "控制力最高，适合长期 24/7 运行。",
    },
    {
      id: "special",
      label: "特殊场景",
      description: "实验运行时、macOS VM 与特定平台集成。",
    },
  ],
  modes: [
    {
      id: "installer-script",
      name: "Installer Script (install.sh / install.ps1)",
      categoryId: "official",
      summary: "官方推荐路径，自动处理 Node 22+ 和基础检查。",
      bestFor: "首次安装、通用本地环境",
      platforms: ["macOS", "Linux", "WSL2", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install`,
      steps: [
        {
          id: "run-installer",
          title: "运行安装器",
          description: "按系统选择命令执行。",
          commands: [
            {
              id: "install-sh",
              title: "macOS / Linux / WSL2",
              shell: "bash",
              command: "curl -fsSL https://openclaw.ai/install.sh | bash",
            },
            {
              id: "install-ps1",
              title: "Windows PowerShell",
              shell: "powershell",
              command: "iwr -useb https://openclaw.ai/install.ps1 | iex",
            },
          ],
        },
        {
          id: "skip-onboarding",
          title: "可选：仅安装不启动向导",
          description: "用于 CI 或你计划后续手动配置。",
          commands: [
            {
              id: "install-sh-no-onboard",
              title: "macOS / Linux / WSL2",
              shell: "bash",
              command: "curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard",
            },
            {
              id: "install-ps1-no-onboard",
              title: "Windows PowerShell",
              shell: "powershell",
              command:
                '& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard',
            },
          ],
        },
      ],
    },
    {
      id: "installer-cli",
      name: "Local Prefix Installer (install-cli.sh)",
      categoryId: "official",
      summary: "安装到本地前缀（默认 ~/.openclaw），适合无 root 权限环境。",
      bestFor: "CI、受限环境、本地隔离安装",
      platforms: ["macOS", "Linux", "WSL2"],
      docsUrl: `${DOCS_BASE_URL}/install/installer`,
      steps: [
        {
          id: "run-install-cli",
          title: "运行本地前缀安装器",
          description: "默认会把 Node 与 OpenClaw 安装到本地目录。",
          commands: [
            {
              id: "install-cli-default",
              title: "默认前缀",
              shell: "bash",
              command: "curl -fsSL https://openclaw.ai/install-cli.sh | bash",
            },
            {
              id: "install-cli-custom-prefix",
              title: "自定义前缀 + JSON 输出",
              shell: "bash",
              command:
                "curl -fsSL https://openclaw.ai/install-cli.sh | bash -s -- --prefix /opt/openclaw --version latest --json",
            },
          ],
        },
      ],
    },
    {
      id: "npm-pnpm",
      name: "npm / pnpm 全局安装",
      categoryId: "manual",
      summary: "Node 22+ 已就绪时，最直接的手动安装方式。",
      bestFor: "已有 Node 环境、偏好手动控制",
      platforms: ["macOS", "Linux", "Windows", "WSL2"],
      docsUrl: `${DOCS_BASE_URL}/install`,
      steps: [
        {
          id: "global-install",
          title: "执行全局安装",
          description: "选择 npm 或 pnpm 其中一种。",
          commands: [
            {
              id: "npm-global-install",
              title: "npm",
              shell: "bash",
              command: "npm install -g openclaw@latest",
            },
            {
              id: "pnpm-global-install",
              title: "pnpm",
              shell: "bash",
              command: "pnpm add -g openclaw@latest",
            },
            {
              id: "pnpm-approve-builds",
              title: "pnpm 首次需授权构建脚本",
              shell: "bash",
              command: "pnpm approve-builds -g",
            },
          ],
        },
        {
          id: "run-onboard",
          title: "启动 onboarding",
          description: "完成网关基础配置。",
          commands: [
            {
              id: "onboard",
              title: "onboard",
              shell: "bash",
              command: "openclaw onboard --install-daemon",
            },
          ],
        },
      ],
    },
    {
      id: "from-source",
      name: "From Source",
      categoryId: "manual",
      summary: "源码构建并链接 CLI，适合贡献者与深度定制。",
      bestFor: "二次开发、调试、提 PR",
      platforms: ["macOS", "Linux", "Windows", "WSL2"],
      docsUrl: `${DOCS_BASE_URL}/install`,
      steps: [
        {
          id: "clone-build",
          title: "拉取并构建",
          description: "按仓库脚本安装依赖并编译。",
          commands: [
            {
              id: "source-clone",
              title: "clone",
              shell: "bash",
              command: "git clone https://github.com/openclaw/openclaw.git && cd openclaw",
            },
            {
              id: "source-install-build",
              title: "安装并构建",
              shell: "bash",
              command: "pnpm install && pnpm ui:build && pnpm build",
            },
            {
              id: "source-link",
              title: "全局链接命令",
              shell: "bash",
              command: "pnpm link --global",
            },
          ],
        },
      ],
    },
    {
      id: "node-manual",
      name: "Node.js 手动准备",
      categoryId: "manual",
      summary: "先手工准备 Node 22+ 再进行任意安装模式。",
      bestFor: "受限主机、预装基础环境",
      platforms: ["macOS", "Linux", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install/node`,
      steps: [
        {
          id: "check-node",
          title: "检查 Node 版本",
          description: "需要 v22 或更高。",
          commands: [
            {
              id: "node-version",
              title: "查看版本",
              shell: "bash",
              command: "node -v",
            },
          ],
        },
        {
          id: "install-node",
          title: "安装 Node 22+",
          description: "不同系统选择不同命令。",
          commands: [
            {
              id: "node-linux-nodesource",
              title: "Ubuntu / Debian",
              shell: "bash",
              command:
                "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs",
            },
            {
              id: "node-windows-winget",
              title: "Windows",
              shell: "powershell",
              command: "winget install OpenJS.NodeJS.LTS",
            },
          ],
        },
      ],
    },
    {
      id: "docker",
      name: "Docker",
      categoryId: "container",
      summary: "容器化网关部署，支持 sandbox 与卷持久化。",
      bestFor: "隔离部署、服务器与自动化",
      platforms: ["Linux", "macOS", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install/docker`,
      steps: [
        {
          id: "docker-quickstart",
          title: "快速启动",
          description: "在仓库根目录执行一键脚本。",
          commands: [
            {
              id: "docker-setup",
              title: "初始化 Docker 部署",
              shell: "bash",
              command: "./docker-setup.sh",
            },
            {
              id: "docker-dashboard",
              title: "获取 dashboard 链接",
              shell: "bash",
              command: "docker compose run --rm openclaw-cli dashboard --no-open",
            },
          ],
        },
      ],
    },
    {
      id: "podman",
      name: "Podman Rootless",
      categoryId: "container",
      summary: "以 rootless 模式运行 OpenClaw 容器。",
      bestFor: "Podman 环境、强化隔离",
      platforms: ["Linux"],
      docsUrl: `${DOCS_BASE_URL}/install/podman`,
      steps: [
        {
          id: "podman-setup",
          title: "一次性安装",
          description: "创建 openclaw 用户并部署脚本。",
          commands: [
            {
              id: "podman-bootstrap",
              title: "初始化",
              shell: "bash",
              command: "./setup-podman.sh",
            },
            {
              id: "podman-launch",
              title: "启动网关",
              shell: "bash",
              command: "./scripts/run-openclaw-podman.sh launch",
            },
          ],
        },
      ],
    },
    {
      id: "bun",
      name: "Bun (Experimental)",
      categoryId: "special",
      summary: "可用 Bun 提升本地开发速度，但不建议作为网关生产运行时。",
      bestFor: "本地开发迭代",
      platforms: ["macOS", "Linux", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install/bun`,
      steps: [
        {
          id: "bun-install",
          title: "安装与构建",
          description: "用于本地开发，不建议生产。",
          commands: [
            {
              id: "bun-install-cmd",
              title: "安装依赖",
              shell: "bash",
              command: "bun install",
            },
            {
              id: "bun-build-cmd",
              title: "构建/测试",
              shell: "bash",
              command: "bun run build && bun run vitest run",
            },
          ],
        },
      ],
    },
    {
      id: "nix",
      name: "Nix / nix-openclaw",
      categoryId: "automation",
      summary: "声明式安装，可回滚，适合 Nix 用户。",
      bestFor: "可重现部署、Home Manager",
      platforms: ["macOS", "Linux"],
      docsUrl: `${DOCS_BASE_URL}/install/nix`,
      steps: [
        {
          id: "nix-mode",
          title: "启用 Nix 模式",
          description: "在运行时关闭自修改流程并使用声明式路径。",
          commands: [
            {
              id: "nix-env",
              title: "Shell 环境变量",
              shell: "bash",
              command: "export OPENCLAW_NIX_MODE=1",
            },
            {
              id: "nix-macos-defaults",
              title: "macOS GUI 默认项",
              shell: "bash",
              command: "defaults write ai.openclaw.mac openclaw.nixMode -bool true",
            },
          ],
          notes: [
            "完整安装流程请使用 github.com/openclaw/nix-openclaw 的模板与 README。",
          ],
        },
      ],
    },
    {
      id: "ansible",
      name: "Ansible (openclaw-ansible)",
      categoryId: "automation",
      summary: "自动化加固部署，默认包含防火墙、Tailscale 与 systemd。",
      bestFor: "生产服务器、团队运维",
      platforms: ["Debian", "Ubuntu"],
      docsUrl: `${DOCS_BASE_URL}/install/ansible`,
      steps: [
        {
          id: "ansible-quickstart",
          title: "一键安装",
          description: "自动安装 Ansible 并执行部署脚本。",
          commands: [
            {
              id: "ansible-install",
              title: "Quick start",
              shell: "bash",
              command:
                "curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash",
            },
          ],
        },
      ],
    },
    {
      id: "railway",
      name: "Railway",
      categoryId: "managed",
      summary: "托管一键部署，主要通过 /setup 页面完成配置。",
      bestFor: "零服务器运维、快速上线",
      platforms: ["Railway"],
      docsUrl: `${DOCS_BASE_URL}/install/railway`,
      steps: [
        {
          id: "railway-deploy",
          title: "创建服务",
          description: "使用官方模板，并配置 Volume 与环境变量。",
          notes: [
            "Deploy: https://railway.com/deploy/clawdbot-railway-template",
            "必填变量: SETUP_PASSWORD, PORT=8080",
            "推荐变量: OPENCLAW_STATE_DIR=/data/.openclaw, OPENCLAW_WORKSPACE_DIR=/data/workspace",
          ],
        },
      ],
    },
    {
      id: "render",
      name: "Render Blueprint",
      categoryId: "managed",
      summary: "使用 render.yaml 声明式部署，支持持久磁盘。",
      bestFor: "可版本化托管部署",
      platforms: ["Render"],
      docsUrl: `${DOCS_BASE_URL}/install/render`,
      steps: [
        {
          id: "render-deploy",
          title: "Blueprint 部署",
          description: "通过 Render Blueprint 一键创建服务。",
          notes: [
            "Deploy: https://render.com/deploy?repo=https://github.com/openclaw/openclaw",
            "需设置 SETUP_PASSWORD；生产建议使用 Starter 或更高套餐以启用持久磁盘。",
          ],
        },
      ],
    },
    {
      id: "northflank",
      name: "Northflank",
      categoryId: "managed",
      summary: "模板化部署，完成后通过 /setup 初始化。",
      bestFor: "托管平台快速部署",
      platforms: ["Northflank"],
      docsUrl: `${DOCS_BASE_URL}/install/northflank`,
      steps: [
        {
          id: "northflank-deploy",
          title: "模板部署",
          description: "部署栈并配置 SETUP_PASSWORD。",
          notes: [
            "Deploy: https://northflank.com/stacks/deploy-openclaw",
            "完成后访问 /setup 和 /openclaw。",
          ],
        },
      ],
    },
    {
      id: "fly",
      name: "Fly.io",
      categoryId: "vps",
      summary: "基于 fly.toml 与 volume 的长期运行部署。",
      bestFor: "全球可访问、容器化云主机",
      platforms: ["Fly.io"],
      docsUrl: `${DOCS_BASE_URL}/install/fly`,
      steps: [
        {
          id: "fly-bootstrap",
          title: "创建应用与存储",
          description: "先创建 app 与 volume，再配置 secrets。",
          commands: [
            {
              id: "fly-app-create",
              title: "创建应用",
              shell: "bash",
              command: "fly apps create my-openclaw",
            },
            {
              id: "fly-volume-create",
              title: "创建 volume",
              shell: "bash",
              command: "fly volumes create openclaw_data --size 1 --region iad",
            },
            {
              id: "fly-deploy",
              title: "部署",
              shell: "bash",
              command: "fly deploy",
            },
          ],
        },
      ],
    },
    {
      id: "gcp",
      name: "GCP Compute Engine",
      categoryId: "vps",
      summary: "自管 VM + Docker 的生产部署方案。",
      bestFor: "企业云主机、细粒度网络控制",
      platforms: ["GCP"],
      docsUrl: `${DOCS_BASE_URL}/install/gcp`,
      steps: [
        {
          id: "gcp-create-vm",
          title: "创建 VM",
          description: "推荐 e2-small 起步，避免本地构建 OOM。",
          commands: [
            {
              id: "gcp-create-instance",
              title: "创建实例",
              shell: "bash",
              command:
                "gcloud compute instances create openclaw-gateway --zone=us-central1-a --machine-type=e2-small --boot-disk-size=20GB --image-family=debian-12 --image-project=debian-cloud",
            },
            {
              id: "gcp-ssh",
              title: "SSH 连接",
              shell: "bash",
              command: "gcloud compute ssh openclaw-gateway --zone=us-central1-a",
            },
          ],
        },
      ],
    },
    {
      id: "hetzner",
      name: "Hetzner VPS",
      categoryId: "vps",
      summary: "低成本 24/7 Docker 运行方案。",
      bestFor: "自管廉价 VPS",
      platforms: ["Hetzner", "Linux VPS"],
      docsUrl: `${DOCS_BASE_URL}/install/hetzner`,
      steps: [
        {
          id: "hetzner-bootstrap",
          title: "主机初始化",
          description: "安装 Docker 并启动 compose。",
          commands: [
            {
              id: "hetzner-docker",
              title: "安装 Docker",
              shell: "bash",
              command: "apt-get update && apt-get install -y git curl ca-certificates && curl -fsSL https://get.docker.com | sh",
            },
            {
              id: "hetzner-run",
              title: "构建并启动",
              shell: "bash",
              command: "docker compose build && docker compose up -d openclaw-gateway",
            },
          ],
        },
      ],
    },
    {
      id: "exe-dev",
      name: "exe.dev VM",
      categoryId: "vps",
      summary: "在 exe.dev VM 上部署，并通过 https 代理远程访问。",
      bestFor: "轻量远程主机",
      platforms: ["exe.dev"],
      docsUrl: `${DOCS_BASE_URL}/install/exe-dev`,
      steps: [
        {
          id: "exe-dev-provision",
          title: "创建并连接 VM",
          description: "创建 VM 后安装 OpenClaw。",
          commands: [
            {
              id: "exe-new",
              title: "创建 VM",
              shell: "bash",
              command: "ssh exe.dev new",
            },
            {
              id: "exe-install-openclaw",
              title: "安装 OpenClaw",
              shell: "bash",
              command: "curl -fsSL https://openclaw.ai/install.sh | bash",
            },
          ],
        },
      ],
    },
    {
      id: "macos-vm",
      name: "macOS VM (Lume / Hosted Mac)",
      categoryId: "special",
      summary: "隔离环境运行 OpenClaw，支持 iMessage/BlueBubbles 场景。",
      bestFor: "macOS 能力隔离、iMessage 集成",
      platforms: ["macOS VM"],
      docsUrl: `${DOCS_BASE_URL}/install/macos-vm`,
      steps: [
        {
          id: "lume-create",
          title: "创建 macOS VM",
          description: "完成 Setup Assistant 后启用 Remote Login。",
          commands: [
            {
              id: "lume-create-command",
              title: "创建 VM",
              shell: "bash",
              command: "lume create openclaw --os macos --ipsw latest",
            },
            {
              id: "lume-run-headless",
              title: "后台运行 VM",
              shell: "bash",
              command: "lume run openclaw --no-display",
            },
            {
              id: "vm-install-openclaw",
              title: "VM 内安装 OpenClaw",
              shell: "bash",
              command: "npm install -g openclaw@latest && openclaw onboard --install-daemon",
            },
          ],
        },
      ],
    },
  ],
};

function detectPlatform(): OpenClawDesktopGuide["platform"] {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac os")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

function quoteValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

class OpenClawInstallServiceClass {
  async getInstallCatalog(): Promise<OpenClawInstallCatalog> {
    return catalog;
  }

  async getDesktopGuide(): Promise<OpenClawDesktopGuide> {
    const platform = detectPlatform();

    if (platform === "windows") {
      return {
        platform,
        recommendation: "优先使用 WSL2 + install.sh，其次使用 install.ps1。",
        notes: [
          "官方文档对 Windows 推荐 WSL2 路径。",
          "若直接 PowerShell 安装，请确认 PATH 中能找到全局 npm bin。",
        ],
        quickCommands: [
          {
            id: "desktop-win-powershell",
            title: "PowerShell 快速安装",
            shell: "powershell",
            command: "iwr -useb https://openclaw.ai/install.ps1 | iex",
          },
          {
            id: "desktop-win-no-onboard",
            title: "仅安装不引导",
            shell: "powershell",
            command:
              '& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard',
          },
          {
            id: "desktop-win-verify",
            title: "安装验证",
            shell: "powershell",
            command: "openclaw doctor; openclaw status",
          },
        ],
      };
    }

    if (platform === "macos" || platform === "linux") {
      return {
        platform,
        recommendation: "使用 install.sh，一次完成安装与 onboarding。",
        notes: [
          "macOS/Linux 默认路径推荐 install.sh。",
          "需要 CI 或自动化时请加 --no-onboard。",
        ],
        quickCommands: [
          {
            id: "desktop-unix-install",
            title: "标准安装",
            shell: "bash",
            command: "curl -fsSL https://openclaw.ai/install.sh | bash",
          },
          {
            id: "desktop-unix-no-onboard",
            title: "自动化安装",
            shell: "bash",
            command: "curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard",
          },
          {
            id: "desktop-unix-verify",
            title: "安装验证",
            shell: "bash",
            command: "openclaw doctor && openclaw status && openclaw dashboard",
          },
        ],
      };
    }

    return {
      platform,
      recommendation: "优先走官方安装器，并根据平台改用对应脚本。",
      notes: [
        "未知平台请从 docs.openclaw.ai/install 选择适配模式。",
      ],
      quickCommands: [
        {
          id: "desktop-generic-install",
          title: "通用安装命令（Unix）",
          shell: "bash",
          command: "curl -fsSL https://openclaw.ai/install.sh | bash",
        },
      ],
    };
  }

  async getPostInstallCommands(profile: OpenClawPostInstallProfile): Promise<OpenClawInstallCommand[]> {
    const commands: OpenClawInstallCommand[] = [
      {
        id: "config-mode",
        title: "设置网关模式",
        shell: "bash",
        command: `openclaw config set gateway.mode ${profile.gatewayMode}`,
      },
      {
        id: "config-bind",
        title: "设置绑定模式",
        shell: "bash",
        command: `openclaw config set gateway.bind ${profile.gatewayBind}`,
      },
      {
        id: "restart-gateway",
        title: "重启网关",
        shell: "bash",
        command: "openclaw gateway restart",
      },
    ];

    const normalizedPort = profile.gatewayPort.trim();
    if (normalizedPort) {
      commands.splice(2, 0, {
        id: "run-port",
        title: "手动指定端口运行（可选）",
        shell: "bash",
        command: `openclaw gateway --port ${normalizedPort}`,
      });
    }

    const normalizedToken = profile.gatewayToken.trim();
    if (normalizedToken) {
      commands.push({
        id: "config-token",
        title: "设置控制 UI Token",
        shell: "bash",
        command: `openclaw config set gateway.auth.token ${quoteValue(normalizedToken)}`,
      });
    }

    const normalizedStateDir = profile.stateDir.trim();
    if (normalizedStateDir) {
      commands.push({
        id: "env-state-dir",
        title: "设置状态目录（当前 shell）",
        shell: "bash",
        command: `export OPENCLAW_STATE_DIR=${quoteValue(normalizedStateDir)}`,
      });
    }

    const normalizedConfigPath = profile.configPath.trim();
    if (normalizedConfigPath) {
      commands.push({
        id: "env-config-path",
        title: "设置配置文件路径（当前 shell）",
        shell: "bash",
        command: `export OPENCLAW_CONFIG_PATH=${quoteValue(normalizedConfigPath)}`,
      });
    }

    const normalizedWorkspaceDir = profile.workspaceDir.trim();
    if (normalizedWorkspaceDir) {
      commands.push({
        id: "env-workspace",
        title: "设置工作区路径（当前 shell）",
        shell: "bash",
        command: `export OPENCLAW_HOME=${quoteValue(normalizedWorkspaceDir)}`,
      });
    }

    if (profile.channels.telegram) {
      commands.push({
        id: "channel-telegram",
        title: "配置 Telegram（替换 token）",
        shell: "bash",
        command: 'openclaw channels add --channel telegram --token "<telegram_bot_token>"',
      });
    }

    if (profile.channels.discord) {
      commands.push({
        id: "channel-discord",
        title: "配置 Discord（替换 token）",
        shell: "bash",
        command: 'openclaw channels add --channel discord --token "<discord_bot_token>"',
      });
    }

    if (profile.channels.whatsapp) {
      commands.push({
        id: "channel-whatsapp",
        title: "登录 WhatsApp",
        shell: "bash",
        command: "openclaw channels login",
      });
    }

    if (profile.channels.signal) {
      commands.push({
        id: "channel-signal",
        title: "查看通道状态并完成 Signal 配置",
        shell: "bash",
        command: "openclaw channels status --probe",
      });
    }

    commands.push(
      {
        id: "verify-doctor",
        title: "健康检查",
        shell: "bash",
        command: "openclaw doctor",
      },
      {
        id: "verify-status",
        title: "状态检查",
        shell: "bash",
        command: "openclaw status",
      },
      {
        id: "verify-dashboard",
        title: "打开控制台",
        shell: "bash",
        command: "openclaw dashboard",
      },
    );

    return commands;
  }
}

export const OpenClawInstallService = new OpenClawInstallServiceClass();

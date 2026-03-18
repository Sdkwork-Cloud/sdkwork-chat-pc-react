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
      label: "Official installer",
      description: "Recommended for most users. Detects Node, installs OpenClaw, and runs onboarding.",
    },
    {
      id: "manual",
      label: "Manual installation",
      description: "Use this when Node is already available or when developing from source.",
    },
    {
      id: "container",
      label: "Containerized installation",
      description: "Best for isolated deployments, reproducible environments, and server use cases.",
    },
    {
      id: "automation",
      label: "Automation / declarative",
      description: "Best for enterprise ops, bulk rollouts, and rollback-friendly configuration.",
    },
    {
      id: "managed",
      label: "Managed platforms",
      description: "Deploy to cloud platforms with less host maintenance overhead.",
    },
    {
      id: "vps",
      label: "Self-managed cloud hosts",
      description: "Maximum control, ideal for long-running 24/7 deployments.",
    },
    {
      id: "special",
      label: "Special scenarios",
      description: "Experimental runtimes, macOS VMs, and platform-specific integrations.",
    },
  ],
  modes: [
    {
      id: "installer-script",
      name: "Installer Script (install.sh / install.ps1)",
      categoryId: "official",
      summary: "Official recommended path that handles Node 22+ and baseline checks automatically.",
      bestFor: "First-time setup and common local environments",
      platforms: ["macOS", "Linux", "WSL2", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install`,
      steps: [
        {
          id: "run-installer",
          title: "Run the installer",
          description: "Pick and execute the command for your operating system.",
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
          title: "Optional: install without onboarding",
          description: "Useful for CI or when you plan to configure manually later.",
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
      summary: "Installs to a local prefix (default `~/.openclaw`) for environments without root access.",
      bestFor: "CI, restricted hosts, and isolated local installation",
      platforms: ["macOS", "Linux", "WSL2"],
      docsUrl: `${DOCS_BASE_URL}/install/installer`,
      steps: [
        {
          id: "run-install-cli",
          title: "Run the local-prefix installer",
          description: "By default, Node and OpenClaw are installed into a local directory.",
          commands: [
            {
              id: "install-cli-default",
              title: "Default prefix",
              shell: "bash",
              command: "curl -fsSL https://openclaw.ai/install-cli.sh | bash",
            },
            {
              id: "install-cli-custom-prefix",
              title: "Custom prefix with JSON output",
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
      name: "npm / pnpm global install",
      categoryId: "manual",
      summary: "The most direct manual option when Node 22+ is already available.",
      bestFor: "Existing Node environments and manual control workflows",
      platforms: ["macOS", "Linux", "Windows", "WSL2"],
      docsUrl: `${DOCS_BASE_URL}/install`,
      steps: [
        {
          id: "global-install",
          title: "Run a global installation",
          description: "Choose either npm or pnpm.",
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
              title: "Authorize build scripts for first-time pnpm use",
              shell: "bash",
              command: "pnpm approve-builds -g",
            },
          ],
        },
        {
          id: "run-onboard",
          title: "Run onboarding",
          description: "Complete baseline gateway configuration.",
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
      summary: "Build from source and link the CLI for contributor and customization workflows.",
      bestFor: "Custom development, debugging, and pull requests",
      platforms: ["macOS", "Linux", "Windows", "WSL2"],
      docsUrl: `${DOCS_BASE_URL}/install`,
      steps: [
        {
          id: "clone-build",
          title: "Clone and build",
          description: "Install dependencies and compile using repository scripts.",
          commands: [
            {
              id: "source-clone",
              title: "clone",
              shell: "bash",
              command: "git clone https://github.com/openclaw/openclaw.git && cd openclaw",
            },
            {
              id: "source-install-build",
              title: "Install and build",
              shell: "bash",
              command: "pnpm install && pnpm ui:build && pnpm build",
            },
            {
              id: "source-link",
              title: "Link CLI globally",
              shell: "bash",
              command: "pnpm link --global",
            },
          ],
        },
      ],
    },
    {
      id: "node-manual",
      name: "Manual Node.js preparation",
      categoryId: "manual",
      summary: "Prepare Node 22+ manually before using any installation mode.",
      bestFor: "Restricted hosts and pre-provisioned base environments",
      platforms: ["macOS", "Linux", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install/node`,
      steps: [
        {
          id: "check-node",
          title: "Check Node version",
          description: "Version v22 or newer is required.",
          commands: [
            {
              id: "node-version",
              title: "Show version",
              shell: "bash",
              command: "node -v",
            },
          ],
        },
        {
          id: "install-node",
          title: "Install Node 22+",
          description: "Use the command that matches your operating system.",
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
      summary: "Containerized gateway deployment with sandbox support and persistent volumes.",
      bestFor: "Isolated deployments, servers, and automation",
      platforms: ["Linux", "macOS", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install/docker`,
      steps: [
        {
          id: "docker-quickstart",
          title: "Quick start",
          description: "Run the one-command script from the repository root.",
          commands: [
            {
              id: "docker-setup",
              title: "Initialize Docker deployment",
              shell: "bash",
              command: "./docker-setup.sh",
            },
            {
              id: "docker-dashboard",
              title: "Get dashboard link",
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
      summary: "Run OpenClaw containers in rootless mode.",
      bestFor: "Podman environments and stronger isolation",
      platforms: ["Linux"],
      docsUrl: `${DOCS_BASE_URL}/install/podman`,
      steps: [
        {
          id: "podman-setup",
          title: "One-time setup",
          description: "Create the openclaw user and deploy scripts.",
          commands: [
            {
              id: "podman-bootstrap",
              title: "Initialize",
              shell: "bash",
              command: "./setup-podman.sh",
            },
            {
              id: "podman-launch",
              title: "Start gateway",
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
      summary: "Bun can speed up local development, but it is not recommended for production gateway runtime.",
      bestFor: "Local development iteration",
      platforms: ["macOS", "Linux", "Windows"],
      docsUrl: `${DOCS_BASE_URL}/install/bun`,
      steps: [
        {
          id: "bun-install",
          title: "Install and build",
          description: "For local development only; not recommended for production.",
          commands: [
            {
              id: "bun-install-cmd",
              title: "Install dependencies",
              shell: "bash",
              command: "bun install",
            },
            {
              id: "bun-build-cmd",
              title: "Build and test",
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
      summary: "Declarative installation with rollback support for Nix users.",
      bestFor: "Reproducible deployments and Home Manager",
      platforms: ["macOS", "Linux"],
      docsUrl: `${DOCS_BASE_URL}/install/nix`,
      steps: [
        {
          id: "nix-mode",
          title: "Enable Nix mode",
          description: "Disable self-mutating flows at runtime and use declarative paths.",
          commands: [
            {
              id: "nix-env",
              title: "Shell environment variable",
              shell: "bash",
              command: "export OPENCLAW_NIX_MODE=1",
            },
            {
              id: "nix-macos-defaults",
              title: "macOS GUI default",
              shell: "bash",
              command: "defaults write ai.openclaw.mac openclaw.nixMode -bool true",
            },
          ],
          notes: [
            "For the full installation flow, use templates and README from github.com/openclaw/nix-openclaw.",
          ],
        },
      ],
    },
    {
      id: "ansible",
      name: "Ansible (openclaw-ansible)",
      categoryId: "automation",
      summary: "Automated hardened deployment with firewall, Tailscale, and systemd defaults.",
      bestFor: "Production servers and team operations",
      platforms: ["Debian", "Ubuntu"],
      docsUrl: `${DOCS_BASE_URL}/install/ansible`,
      steps: [
        {
          id: "ansible-quickstart",
          title: "One-command install",
          description: "Automatically installs Ansible and runs deployment scripts.",
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
      summary: "Managed one-click deployment with most configuration completed on `/setup`.",
      bestFor: "Zero server maintenance and fast launch",
      platforms: ["Railway"],
      docsUrl: `${DOCS_BASE_URL}/install/railway`,
      steps: [
        {
          id: "railway-deploy",
          title: "Create service",
          description: "Use the official template and configure volumes and environment variables.",
          notes: [
            "Deploy: https://railway.com/deploy/clawdbot-railway-template",
            "Required variables: SETUP_PASSWORD, PORT=8080",
            "Recommended variables: OPENCLAW_STATE_DIR=/data/.openclaw, OPENCLAW_WORKSPACE_DIR=/data/workspace",
          ],
        },
      ],
    },
    {
      id: "render",
      name: "Render Blueprint",
      categoryId: "managed",
      summary: "Declarative deployment via render.yaml with persistent disk support.",
      bestFor: "Versioned managed deployments",
      platforms: ["Render"],
      docsUrl: `${DOCS_BASE_URL}/install/render`,
      steps: [
        {
          id: "render-deploy",
          title: "Blueprint deployment",
          description: "Create services with one click through Render Blueprint.",
          notes: [
            "Deploy: https://render.com/deploy?repo=https://github.com/openclaw/openclaw",
            "SETUP_PASSWORD is required. For production, use Starter or higher to enable persistent disk.",
          ],
        },
      ],
    },
    {
      id: "northflank",
      name: "Northflank",
      categoryId: "managed",
      summary: "Template-based deployment, then initialize through `/setup`.",
      bestFor: "Fast deployment on managed platforms",
      platforms: ["Northflank"],
      docsUrl: `${DOCS_BASE_URL}/install/northflank`,
      steps: [
        {
          id: "northflank-deploy",
          title: "Template deployment",
          description: "Deploy the stack and configure SETUP_PASSWORD.",
          notes: [
            "Deploy: https://northflank.com/stacks/deploy-openclaw",
            "After deployment, visit /setup and /openclaw.",
          ],
        },
      ],
    },
    {
      id: "fly",
      name: "Fly.io",
      categoryId: "vps",
      summary: "Long-running deployment based on fly.toml and persistent volumes.",
      bestFor: "Globally accessible containerized cloud hosts",
      platforms: ["Fly.io"],
      docsUrl: `${DOCS_BASE_URL}/install/fly`,
      steps: [
        {
          id: "fly-bootstrap",
          title: "Create app and storage",
          description: "Create the app and volume first, then configure secrets.",
          commands: [
            {
              id: "fly-app-create",
              title: "Create app",
              shell: "bash",
              command: "fly apps create my-openclaw",
            },
            {
              id: "fly-volume-create",
              title: "Create volume",
              shell: "bash",
              command: "fly volumes create openclaw_data --size 1 --region iad",
            },
            {
              id: "fly-deploy",
              title: "Deploy",
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
      summary: "Production deployment with self-managed VM plus Docker.",
      bestFor: "Enterprise cloud hosts and fine-grained network control",
      platforms: ["GCP"],
      docsUrl: `${DOCS_BASE_URL}/install/gcp`,
      steps: [
        {
          id: "gcp-create-vm",
          title: "Create VM",
          description: "Start with e2-small to reduce local build OOM risks.",
          commands: [
            {
              id: "gcp-create-instance",
              title: "Create instance",
              shell: "bash",
              command:
                "gcloud compute instances create openclaw-gateway --zone=us-central1-a --machine-type=e2-small --boot-disk-size=20GB --image-family=debian-12 --image-project=debian-cloud",
            },
            {
              id: "gcp-ssh",
              title: "SSH access",
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
      summary: "Low-cost Docker runtime for 24/7 operation.",
      bestFor: "Self-managed budget VPS",
      platforms: ["Hetzner", "Linux VPS"],
      docsUrl: `${DOCS_BASE_URL}/install/hetzner`,
      steps: [
        {
          id: "hetzner-bootstrap",
          title: "Host bootstrap",
          description: "Install Docker and start compose.",
          commands: [
            {
              id: "hetzner-docker",
              title: "Install Docker",
              shell: "bash",
              command: "apt-get update && apt-get install -y git curl ca-certificates && curl -fsSL https://get.docker.com | sh",
            },
            {
              id: "hetzner-run",
              title: "Build and start",
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
      summary: "Deploy on an exe.dev VM and access remotely through HTTPS proxy.",
      bestFor: "Lightweight remote hosts",
      platforms: ["exe.dev"],
      docsUrl: `${DOCS_BASE_URL}/install/exe-dev`,
      steps: [
        {
          id: "exe-dev-provision",
          title: "Provision and connect VM",
          description: "Create the VM, then install OpenClaw.",
          commands: [
            {
              id: "exe-new",
              title: "Create VM",
              shell: "bash",
              command: "ssh exe.dev new",
            },
            {
              id: "exe-install-openclaw",
              title: "Install OpenClaw",
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
      summary: "Run OpenClaw in isolated environments for iMessage or BlueBubbles scenarios.",
      bestFor: "macOS capability isolation and iMessage integration",
      platforms: ["macOS VM"],
      docsUrl: `${DOCS_BASE_URL}/install/macos-vm`,
      steps: [
        {
          id: "lume-create",
          title: "Create macOS VM",
          description: "Enable Remote Login after completing Setup Assistant.",
          commands: [
            {
              id: "lume-create-command",
              title: "Create VM",
              shell: "bash",
              command: "lume create openclaw --os macos --ipsw latest",
            },
            {
              id: "lume-run-headless",
              title: "Run VM headless",
              shell: "bash",
              command: "lume run openclaw --no-display",
            },
            {
              id: "vm-install-openclaw",
              title: "Install OpenClaw inside VM",
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
        recommendation: "Use WSL2 with install.sh first, and use install.ps1 as the secondary option.",
        notes: [
          "Official documentation recommends the WSL2 path on Windows.",
          "If you install directly from PowerShell, make sure PATH includes the global npm bin directory.",
        ],
        quickCommands: [
          {
            id: "desktop-win-powershell",
            title: "PowerShell quick install",
            shell: "powershell",
            command: "iwr -useb https://openclaw.ai/install.ps1 | iex",
          },
          {
            id: "desktop-win-no-onboard",
            title: "Install only, skip onboarding",
            shell: "powershell",
            command:
              '& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard',
          },
          {
            id: "desktop-win-verify",
            title: "Verify installation",
            shell: "powershell",
            command: "openclaw doctor; openclaw status",
          },
        ],
      };
    }

    if (platform === "macos" || platform === "linux") {
      return {
        platform,
        recommendation: "Use install.sh to complete installation and onboarding in one flow.",
        notes: [
          "install.sh is the recommended default path for macOS and Linux.",
          "Add --no-onboard for CI or automation workflows.",
        ],
        quickCommands: [
          {
            id: "desktop-unix-install",
            title: "Standard install",
            shell: "bash",
            command: "curl -fsSL https://openclaw.ai/install.sh | bash",
          },
          {
            id: "desktop-unix-no-onboard",
            title: "Automated install",
            shell: "bash",
            command: "curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard",
          },
          {
            id: "desktop-unix-verify",
            title: "Verify installation",
            shell: "bash",
            command: "openclaw doctor && openclaw status && openclaw dashboard",
          },
        ],
      };
    }

    return {
      platform,
      recommendation: "Start with the official installer and switch to platform-specific scripts when needed.",
      notes: [
        "For unknown platforms, choose the best-fit mode from docs.openclaw.ai/install.",
      ],
      quickCommands: [
        {
          id: "desktop-generic-install",
          title: "Generic install command (Unix)",
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
        title: "Set gateway mode",
        shell: "bash",
        command: `openclaw config set gateway.mode ${profile.gatewayMode}`,
      },
      {
        id: "config-bind",
        title: "Set gateway bind mode",
        shell: "bash",
        command: `openclaw config set gateway.bind ${profile.gatewayBind}`,
      },
      {
        id: "restart-gateway",
        title: "Restart gateway",
        shell: "bash",
        command: "openclaw gateway restart",
      },
    ];

    const normalizedPort = profile.gatewayPort.trim();
    if (normalizedPort) {
      commands.splice(2, 0, {
        id: "run-port",
        title: "Run with a manual port (optional)",
        shell: "bash",
        command: `openclaw gateway --port ${normalizedPort}`,
      });
    }

    const normalizedToken = profile.gatewayToken.trim();
    if (normalizedToken) {
      commands.push({
        id: "config-token",
        title: "Set control UI token",
        shell: "bash",
        command: `openclaw config set gateway.auth.token ${quoteValue(normalizedToken)}`,
      });
    }

    const normalizedStateDir = profile.stateDir.trim();
    if (normalizedStateDir) {
      commands.push({
        id: "env-state-dir",
        title: "Set state directory (current shell)",
        shell: "bash",
        command: `export OPENCLAW_STATE_DIR=${quoteValue(normalizedStateDir)}`,
      });
    }

    const normalizedConfigPath = profile.configPath.trim();
    if (normalizedConfigPath) {
      commands.push({
        id: "env-config-path",
        title: "Set config file path (current shell)",
        shell: "bash",
        command: `export OPENCLAW_CONFIG_PATH=${quoteValue(normalizedConfigPath)}`,
      });
    }

    const normalizedWorkspaceDir = profile.workspaceDir.trim();
    if (normalizedWorkspaceDir) {
      commands.push({
        id: "env-workspace",
        title: "Set workspace path (current shell)",
        shell: "bash",
        command: `export OPENCLAW_HOME=${quoteValue(normalizedWorkspaceDir)}`,
      });
    }

    if (profile.channels.telegram) {
      commands.push({
        id: "channel-telegram",
        title: "Configure Telegram (replace token)",
        shell: "bash",
        command: 'openclaw channels add --channel telegram --token "<telegram_bot_token>"',
      });
    }

    if (profile.channels.discord) {
      commands.push({
        id: "channel-discord",
        title: "Configure Discord (replace token)",
        shell: "bash",
        command: 'openclaw channels add --channel discord --token "<discord_bot_token>"',
      });
    }

    if (profile.channels.whatsapp) {
      commands.push({
        id: "channel-whatsapp",
        title: "Sign in to WhatsApp",
        shell: "bash",
        command: "openclaw channels login",
      });
    }

    if (profile.channels.signal) {
      commands.push({
        id: "channel-signal",
        title: "Check channel status and finish Signal configuration",
        shell: "bash",
        command: "openclaw channels status --probe",
      });
    }

    commands.push(
      {
        id: "verify-doctor",
        title: "Health check",
        shell: "bash",
        command: "openclaw doctor",
      },
      {
        id: "verify-status",
        title: "Status check",
        shell: "bash",
        command: "openclaw status",
      },
      {
        id: "verify-dashboard",
        title: "Open dashboard",
        shell: "bash",
        command: "openclaw dashboard",
      },
    );

    return commands;
  }
}

export const OpenClawInstallService = new OpenClawInstallServiceClass();

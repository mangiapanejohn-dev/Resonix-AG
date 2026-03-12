# 👾 Resonix

<p align="center">
  <img src="https://github.com/user-attachments/assets/8fc884ad-9139-4f92-b849-b7fffd61d9e6" width="200" alt="Resonix Logo"/>
</p>

<p align="center">
  <strong>Version 2026.3.12</strong><br/>
  An autonomous AI agent with permanent memory & self-learning capabilities
</p>

<p align="center">
  <a href="#">
    <img src="https://img.shields.io/github/stars/mangiapanejohn-dev/Resonix-AG?style=social" alt="GitHub Stars"/>
  </a>
  <a href="https://discord.gg/FKXPBAtPwG">
    <img src="https://img.shields.io/discord/FKXPBAtPwG?label=Discord&logo=discord&style=for-the-badge" alt="Discord"/>
  </a>
  <a href="https://x.com/moralesjavx1032">
    <img src="https://img.shields.io/twitter/follow/moralesjavx1032?logo=X&style=for-the-badge" alt="X"/>
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License"/>
</p>

---

## 😢 Traditional AI Assistants

> **"What do I like?"**
>
> *"I don't know, you just told me."*

Every conversation starts from scratch. They forget everything.

---

## 🤩 Resonix Remembers

> **"What do I like?"**
>
> *"Based on our conversations, you prefer coffee over tea, usually take your coffee with oat milk, and you're a night owl who does your best work between 10PM-2AM."*

**Resonix actually remembers things.** It learns from every conversation and builds on past knowledge.

---

## ✨ Key Features

### 🧠 Memory That Never Forgets

```mermaid
flowchart TB
    USER["👤 User"] -->|"message"| BOT["🤖 Resonix"]
    BOT --> LAYERA["📦 Layer A<br/>System Profile"]
    BOT --> LAYERB["📁 Layer B<br/>Desktop Mirror"]
    LAYERA --> PREF["⚙️ Prefs"]
    LAYERA --> FACTS["📌 Facts"]
    LAYERA --> PAT["🔄 Patterns"]
    LAYERB --> ID["👤 identity"]
    LAYERB --> KNOW["📚 knowledge"]
    LAYERB --> LOGS["📜 logs"]

    style BOT fill:#7c3aed,stroke:#7c3aed,color:#fff
    style LAYERA fill:#e0e7ff,stroke:#4f46e5
    style LAYERB fill:#f0fdf4,stroke:#16a34a
```

Two-layer permanent memory. Layer A stores machine-readable profile, Layer B creates human-readable files at `~/Desktop/resonix-M/`. Every conversation builds on the last.

---

### 🔄 Gets Smarter Over Time

```mermaid
flowchart LR
    TASK[📋 Task] --> RESULT[📊 Result]
    RESULT --> RETRO[🔍 Review]
    RETRO --> LEARN[📚 Learn]
    LEARN -.-> TASK
    style TASK fill:#e0f2fe,stroke:#0284c7
    style RESULT fill:#fef3c7,stroke:#d97706
    style RETRO fill:#f3e8ff,stroke:#9333ea
    style LEARN fill:#dcfce7,stroke:#16a34a
```

Execute task → Analyze result → Create retrospective → Store learning → Improve next task. Remembers what worked and what didn't.

---

### 🌐 Browser That Just Works

```mermaid
flowchart LR
    OLD[❌ Old] -->|breaks| NEW[✅ Resonix]
    EXT[🔌 Ext] -->|unreliable| PW[🎭 Playwright]
    SEL[🎯 Selector] -->|unstable| SMART[🧠 Smart Detection]
    SS[📸 Manual] -->|slow| AUTO[🤖 Auto Capture]

    style OLD fill:#fee2e2,stroke:#ef4444
    style NEW fill:#dcfce7,stroke:#22c55e
    style PW fill:#dcfce7,stroke:#22c55e
    style SMART fill:#dcfce7,stroke:#22c55e
    style AUTO fill:#dcfce7,stroke:#22c55e
```

Playwright-powered instead of fragile Chrome extensions. Smart element detection survives UI updates. Automatic screenshots & consistent results.

---

### 📊 Know Your Automation Status

```mermaid
pie title Task Results
    "✅ Success" : 82
    "❌ Errors" : 18
```

Success/Error rate tracking, P95 response time metrics, and risk level assessment. Always know how your automation is performing.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Users[👤 Channels]
        T[Telegram]:::purple
        D[Discord]:::purple
        S[Slack]:::purple
        W[WhatsApp]:::purple
    end

    subgraph Gateway[🚀 Gateway]
        R[Routing]
        A[Auth]
        C[Channels]
    end

    subgraph Agent[🤖 Agent Runtime]
        M[🧠 Memory]
        B[🌐 Browser]
        T2[🔧 Tools]
        G[🔄 Growth]
        I[👤 Identity]
    end

    subgraph Memory[💾 Memory]
        MA[Layer A]
        MB[Layer B]
    end

    Users --> Gateway
    Gateway --> Agent
    Agent --> Memory
    M --> MA
    M --> MB

    style Users fill:none,stroke:#7c3aed,stroke-width:2px
    style Gateway fill:none,stroke:#7c3aed,stroke-width:2px
    style Agent fill:none,stroke:#7c3aed,stroke-width:2px
    style Memory fill:none,stroke:#7c3aed,stroke-width:2px
    style T fill:none,stroke:#9333ea
    style D fill:none,stroke:#9333ea
    style S fill:none,stroke:#9333ea
    style W fill:none,stroke:#9333ea
    style R fill:none,stroke:#9333ea
    style A fill:none,stroke:#9333ea
    style C fill:none,stroke:#9333ea
    style M fill:none,stroke:#9333ea
    style B fill:none,stroke:#9333ea
    style T2 fill:none,stroke:#9333ea
    style G fill:none,stroke:#9333ea
    style I fill:none,stroke:#9333ea
    style MA fill:none,stroke:#9333ea
    style MB fill:none,stroke:#9333ea
```

---

## 🚀 Quick Start

### One-Line Install

| Platform | Command |
|----------|---------|
| **macOS / Linux** | ```curl -fsSL https://resonix.ai/install.sh \| bash``` |
| **Windows** | ```iwr -useb https://resonix.ai/install.ps1 \| iex``` |
| **Termux** | ```curl -fsSL https://resonix.ai/install-termux.sh \| bash``` |

### Get Started

```bash
resonix -v              # Verify installation
resonix onboard         # First-time setup
resonix gateway         # Start the gateway
```

---

## 📱 Supported Channels

<p align="center">
  <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"/>
  <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"/>
  <href="https://slack.com">
  <img src="https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white" alt="Slack"/>
  </img>
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp"/>
  <img src="https://img.shields.io/badge/Signal-3A76DF?style=for-the-badge&logo=signal&logoColor=white" alt="Signal"/>
</p>

---

## 📂 What Resonix Remembers

```
~/Desktop/resonix-M/
│
├── identity/           # "Mark is a 14-year-old developer from Hong Kong"
├── knowledge/          # "Coffee with oat milk, not tea"
├── autonomy/          # "Learns faster when given examples"
├── retrospectives/     # "Don't use regex for HTML parsing"
└── logs/              # Conversation history
```

---

## 🎯 Resonix vs Traditional Assistants

| Feature | ChatGPT / Claude / Gemini | Resonix |
|---------|---------------------------|---------|
| **Memory** | Context window only | Permanent + Desktop mirror |
| **Learning** | Starts fresh each chat | Remembers & learns |
| **Identity** | Generic | Knows who you are |
| **Browser** | Extensions / API | Built-in Playwright |
| **Persistence** | Session-based | Long-term storage |

---

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `resonix onboard` | First-time setup |
| `resonix gateway` | Start the gateway |
| `resonix gateway status` | Check status |
| `resonix cron board` | View scheduled tasks |
| `resonix memory profile` | View learned profile |

---

## 🤝 Contributing

```bash
# Clone the repo
git clone https://github.com/mangiapanejohn-dev/Resonix-AG.git
cd Resonix-AG

# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test
```

---

## 📚 Documentation

- **Docs**: [docs.resonix.ai](https://docs.resonix.ai)
- **Discord**: [Join our community](https://discord.gg/FKXPBAtPwG)
- **X**: [Follow us](https://x.com/moralesjavx1032)

---

## ⭐ Show Your Support

> **If Resonix helped you, we'd love a ⭐!**

It motivates me to keep building and improving. 💪

---

## 📄 License

MIT License - Built by [MarkEllington](https://github.com/mangiapanejohn-dev)

---

<p align="center">
  <sub>Made with ❤️ by a 14-year-old developer</sub>
</p>

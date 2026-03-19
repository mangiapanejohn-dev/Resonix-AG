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
    BOT --> LAYERA["📦 Layer A"]
    BOT --> LAYERB["📁 Layer B"]
    LAYERA --> PREF["⚙️ Prefs"]
    LAYERA --> FACTS["📌 Facts"]
    LAYERA --> PAT["🔄 Patterns"]
    LAYERB --> ID["👤 identity"]
    LAYERB --> KNOW["📚 knowledge"]
    LAYERB --> LOGS["📜 logs"]

    style USER fill:#fff,stroke:#333,stroke-width:2,color:#000
    style BOT fill:#7c3aed,stroke:#333,stroke-width:2,color:#fff
    style LAYERA fill:#f3e8ff,stroke:#9333ea,stroke-width:2,color:#000
    style LAYERB fill:#fdf2f8,stroke:#db2777,stroke-width:2,color:#000
    style PREF fill:#fff,stroke:#333,stroke-width:1,color:#000
    style FACTS fill:#fff,stroke:#333,stroke-width:1,color:#000
    style PAT fill:#fff,stroke:#333,stroke-width:1,color:#000
    style ID fill:#fff,stroke:#333,stroke-width:1,color:#000
    style KNOW fill:#fff,stroke:#333,stroke-width:1,color:#000
    style LOGS fill:#fff,stroke:#333,stroke-width:1,color:#000
```

Two-layer permanent memory. Layer A stores machine-readable profile, Layer B creates human-readable files at `~/Desktop/resonix-M/`. Every conversation builds on the last.

---

### 🔄 Gets Smarter Over Time

```mermaid
flowchart LR
    TASK["📋 Task"] --> RESULT["📊 Result"]
    RESULT --> RETRO["🔍 Review"]
    RETRO --> LEARN["📚 Learn"]
    LEARN -.-> TASK

    style TASK fill:#fff,stroke:#db2777,stroke-width:2,color:#000
    style RESULT fill:#fff,stroke:#9333ea,stroke-width:2,color:#000
    style RETRO fill:#fff,stroke:#7c3aed,stroke-width:2,color:#000
    style LEARN fill:#fff,stroke:#6366f1,stroke-width:2,color:#000
```

Execute task → Analyze result → Create retrospective → Store learning → Improve next task. Remembers what worked and what didn't.

---

### 🌐 Browser That Just Works

```mermaid
flowchart LR
    OLD["❌ Old"] -->|breaks| NEW["✅ Resonix"]
    EXT["🔌 Ext"] -->|unreliable| PW["🎭 Playwright"]
    SEL["🎯 Selector"] -->|unstable| SMART["🧠 Smart"]
    SS["📸 Manual"] -->|slow| AUTO["🤖 Auto"]

    style OLD fill:#fee2e2,stroke:#ef4444,stroke-width:2,color:#000
    style NEW fill:#dcfce7,stroke:#22c55e,stroke-width:2,color:#000
    style EXT fill:#fff,stroke:#333,stroke-width:1,color:#000
    style PW fill:#fff,stroke:#22c55e,stroke-width:2,color:#000
    style SEL fill:#fff,stroke:#333,stroke-width:1,color:#000
    style SMART fill:#fff,stroke:#22c55e,stroke-width:2,color:#000
    style SS fill:#fff,stroke:#333,stroke-width:1,color:#000
    style AUTO fill:#fff,stroke:#22c55e,stroke-width:2,color:#000
```

Playwright-powered instead of fragile Chrome extensions. Smart element detection survives UI updates. Automatic screenshots & consistent results.

---

### 📊 Know Your Automation Status

```mermaid
pie title Task Results
    "✅ Success 82%" : 82
    "❌ Errors 18%" : 18
```

Success/Error rate tracking, P95 response time metrics, and risk level assessment. Always know how your automation is performing.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Users[👤 Channels]
        T[Telegram]
        D[Discord]
        S[Slack]
        W[WhatsApp]
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

    style Users fill:#fff,stroke:#7c3aed,stroke-width:2,color:#000
    style Gateway fill:#fff,stroke:#7c3aed,stroke-width:2,color:#000
    style Agent fill:#fff,stroke:#db2777,stroke-width:2,color:#000
    style Memory fill:#fff,stroke:#9333ea,stroke-width:2,color:#000
    style T fill:#fff,stroke:#7c3aed,stroke-width:1,color:#000
    style D fill:#fff,stroke:#7c3aed,stroke-width:1,color:#000
    style S fill:#fff,stroke:#7c3aed,stroke-width:1,color:#000
    style W fill:#fff,stroke:#7c3aed,stroke-width:1,color:#000
    style R fill:#fff,stroke:#333,stroke-width:1,color:#000
    style A fill:#fff,stroke:#333,stroke-width:1,color:#000
    style C fill:#fff,stroke:#333,stroke-width:1,color:#000
    style M fill:#fff,stroke:#db2777,stroke-width:2,color:#000
    style B fill:#fff,stroke:#9333ea,stroke-width:2,color:#000
    style T2 fill:#fff,stroke:#333,stroke-width:1,color:#000
    style G fill:#fff,stroke:#db2777,stroke-width:1,color:#000
    style I fill:#fff,stroke:#db2777,stroke-width:1,color:#000
    style MA fill:#fff,stroke:#9333ea,stroke-width:1,color:#000
    style MB fill:#fff,stroke:#db2777,stroke-width:1,color:#000
```

---

## 🚀 Quick Start

### One-Line Install

| Platform | Command |
|----------|---------|
| **macOS / Linux** | ```curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh \| bash``` |
| **Windows** | ```iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 \| iex``` |
| **Termux** | ```curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install-termux.sh \| bash``` |

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
├── identity/           # "Mark is a funny boy developer from Hong Kong"
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

- **Docs**: [docs.resonix.ai](https://resonix.milcorx.com/docs/install.html)
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
  <sub>Made with ❤️ by a Personl developer</sub>
</p>

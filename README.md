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

### 🧠 Two-Layer Permanent Memory

```mermaid
flowchart LR
    subgraph CONV["💬 Conversation"]
        direction TB
        Q["User Message"]
        A["AI Response"]
    end

    subgraph LAYER_A["🔧 Layer A: System Profile"]
        direction TB
        PREF["⚙️ Preferences"]
        FACTS["📌 Facts"]
        PATTERNS["🔄 Patterns"]
        CONF["📊 Confidence"]
    end

    subgraph LAYER_B["📁 Layer B: Desktop Mirror"]
        direction TB
        ID["👤 identity/"]
        KNOW["📚 knowledge/"]
        AUTO["🧠 autonomy/"]
        RETRO["📝 retrospectives/"]
        LOGS["📜 logs/"]
    end

    CONV --> LAYER_A
    CONV --> LAYER_B
    LAYER_A -.->|stores| PREF
    LAYER_A -.->|stores| FACTS
    LAYER_A -.->|stores| PATTERNS
    LAYER_A -.->|stores| CONF
    LAYER_B -.-> ID
    LAYER_B -.-> KNOW
    LAYER_B -.-> AUTO
    LAYER_B -.-> RETRO
    LAYER_B -.-> LOGS

    style LAYER_A fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    style LAYER_B fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
```

### 🔄 Self-Growth Loop

```mermaid
flowchart LR
    TASK["📋 Task"] --> |"execute"| RESULT["📊 Result"]
    RESULT --> |"analyze"| RETRO["🔍 Retrospective"]
    RETRO --> |"extract learnings"| LEARN["📚 Learning"]
    LEARN --> |"apply"| BETTER["✨ Better Next Task"]
    BETTER --> TASK

    style TASK fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style RESULT fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style RETRO fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style LEARN fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style BETTER fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
```

### 🌐 Built-in Browser Control

```mermaid
flowchart LR
    subgraph TRADITION["❌ Without Resonix"]
        EXT["🔌 Chrome Extensions"]
        SELECT["🎯 Fragile Selectors"]
        SCREEN["📸 Manual Screenshots"]
        BROKE["💥 It Worked Yesterday"]
    end

    subgraph RESONIX["✅ With Resonix"]
        PW["🎭 Playwright"]
        SMART["🧠 Smart Detection"]
        AUTO["🤖 Automatic Capture"]
        CONSISTENT["⚡ Consistent Automation"]
    end

    EXT -->|breaks| PW
    SELECT -->|unreliable| SMART
    SCREEN -->|slow| AUTO
    BROKE -->|flaky| CONSISTENT

    style TRADITION fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style RESONIX fill:#dcfce7,stroke:#22c55e,stroke-width:2px
```

### 📊 Cron Intelligence Board

```mermaid
flowchart TB
    subgraph BOARD["📊 Cron Intelligence Board"]
        direction TB
        SUC["✅ Success Rate"]
        ERR["❌ Error Rate"]
        TIME["⏱️ P95 Response Time"]
        RISK["⚠️ Risk Level"]
    end

    SUC --> |"82%"| BAR1["████████████"]
    ERR --> |"18%"| BAR2["████░░░░░░░"]
    TIME --> |"2.3s"| BAR3["████████████"]
    RISK --> |"Low"| BAR4["██░░░░░░░░░░"]

    style BOARD fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    style SUC fill:#dcfce7,stroke:#16a34a
    style ERR fill:#fee2e2,stroke:#ef4444
    style TIME fill:#dbeafe,stroke:#2563eb
    style RISK fill:#fef9c3,stroke:#eab308

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph USER["👤 Users"]
        T["Telegram"]
        D["Discord"]
        S["Slack"]
        W["WhatsApp"]
    end

    subgraph GATEWAY["🚀 Gateway"]
        R["Routing"]
        A["Auth"]
        C["Channels"]
    end

    subgraph AGENT["🤖 Agent Runtime"]
        M["🧠 Memory"]
        B["🌐 Browser"]
        T2["🔧 Tools"]
        G["🔄 Growth"]
        I["👤 Identity"]
    end

    subgraph MEMORY["💾 Memory System"]
        MA["Layer A: System Profile"]
        MB["Layer B: Desktop Mirror"]
    end

    USER --> GATEWAY
    GATEWAY --> AGENT
    AGENT --> MEMORY
    M --> MA
    M --> MB
    G --> AGENT
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
resonix gateway          # Start the gateway
```

---

## 📱 Supported Channels

<p align="center">
  <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"/>
  <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"/>
  <img href="https://slack.com">
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
├── autonomy/           # "Learns faster when given examples"
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

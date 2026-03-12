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

```
┌────────────────────────────────────────────────────────────────┐
│                     YOUR CONVERSATION                           │
└────────────────────────────┬─────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────────┐          ┌─────────────────────────────┐
│   LAYER A          │          │      LAYER B              │
│   System Profile    │          │   Desktop Mirror          │
│   (Machine-Ready)  │          │   (Human-Readable)        │
├─────────────────────┤          ├─────────────────────────────┤
│ • Preferences      │          │ ~/Desktop/resonix-M/      │
│ • Facts           │          │   ├── identity/           │
│ • Patterns        │          │   ├── knowledge/          │
│ • Confidence      │          │   ├── autonomy/           │
│ • Sources        │          │   ├── retrospectives/    │
└─────────────────────┘          │   └── logs/              │
                                └─────────────────────────────┘
```

### 🔄 Self-Growth Loop

```
TASK → RESULT → RETROSPECTIVE → LEARNING → BETTER NEXT TASK
  │                                              ▲
  └──────────────────────────────────────────────┘
```

> Every task outcome → summarized → stored → used for future tasks

### 🌐 Built-in Browser Control

| Without Resonix | With Resonix |
|-----------------|---------------|
| Chrome extensions that break | Playwright-powered reliability |
| Fragile selectors | Smart element detection |
| Manual screenshots | Automatic capture |
| "It worked yesterday" | Consistent automation |

### 📊 Cron Intelligence Board

```
┌──────────────────────────────────────────┐
│         CRON INTELLIGENCE BOARD           │
├──────────────────────────────────────────┤
│                                          │
│   ✅ Success    ████████████░░  82%      │
│   ❌ Errors     ████░░░░░░░░░░  18%      │
│   ⏱️ P95 Time   ████████████░░  2.3s      │
│   ⚠️  Risk     ██░░░░░░░░░░░░  Low       │
│                                          │
└──────────────────────────────────────────┘
```

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

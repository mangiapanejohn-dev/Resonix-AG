<div align="center">
  <h1>👾 Resonix-AG</h1>
</div>

<p align="center">
  <strong>Autonomous AI Agent with Self-Cognition, Learning, and Permanent Memory !</strong>
</p>
<p align="center">
  <strong>Special thanks to OpenClaw for open-source code support !</strong>
</p>

<p align="center">
  <a href="https://discord.gg/FKXPBAtPwG"><img src="https://img.shields.io/discord/FKXPBAtPwG?label=Discord&logo=discord&style=for-the-badge" alt="Discord"></a>
  <a href="https://x.com/moralesjavx1032"><img src="https://img.shields.io/twitter/follow/moralesjavx1032?logo=X&style=for-the-badge" alt="Twitter"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

---

## 🚀 Quick Install (Recommended)

### One-Line Install

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash
```

**Windows (PowerShell as Administrator):**

```powershell
iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 | iex
```

---
## Star History

<a href="https://www.star-history.com/#mangiapanejohn-dev/Resonix-AG&type=timeline&logscale&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=mangiapanejohn-dev/Resonix-AG&type=timeline&theme=dark&logscale&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=mangiapanejohn-dev/Resonix-AG&type=timeline&logscale&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=mangiapanejohn-dev/Resonix-AG&type=timeline&logscale&legend=top-left" />
 </picture>
</a>

---

### Start Resonix

```bash
resonix onboard
```

After installation, restart your terminal or run:

```bash
source ~/.zshrc
```

Then use:

```bash
resonix onboard
resonix gateway start
resonix --help
```

---

## 📖 Getting Started

After installation, run:

```bash
# Interactive onboarding wizard
resonix onboard

# Start the gateway
resonix gateway start

# Check help
resonix --help
```

---

## ✨ About Resonix-AG

**Resonix-AG** is an autonomous AI agent based on OpenClaw with enhanced memory and autonomous learning systems.

Unlike traditional AI assistants that only respond to commands, Resonix-AG can:

- 🧠 **Self-Cognition**: Knows what it knows, identifies knowledge gaps
- 📚 **Autonomous Learning**: Actively learns new knowledge without manual prompts
- 💾 **Permanent Memory**: Remembers learned information forever with smart retention
- 🔄 **Continuous Evolution**: Improves itself over time through learning

## Core Features

### Self-Cognition System

- Capability profiling (hourly updates)
- Knowledge gap detection
- Deviation correction with multi-source validation
- Learning demand recognition

### 4-Layer Memory Architecture

- **Working Memory**: Temporary buffer (30 min TTL)
- **Episodic Memory**: Behavioral logs (1 year retention)
- **Semantic Memory**: Knowledge cards (permanent)
- **Program Memory**: Learning strategies (permanent)

### Autonomous Learning

- Dynamic path planning (Basic → Advanced → Practical → Validation)
- BrewAPI-first with browser fallback
- Anti-crawling simulation
- Results validation

---

## 🔧 Installation (Detailed)

### Prerequisites

- Node.js 22+
- npm or pnpm

### From Source

```bash
# Clone the repository
git clone https://github.com/mangiapanejohn-dev/Resonix-AG.git
cd Resonix-AG

# Install dependencies
pnpm install

# Build
pnpm build

# Run
node resonix.mjs --help
# or use the CLI
resonix --help
```

---

## 📂 Project Structure

```
src/resonix/
├── cognition/           # Self-cognition modules
│   ├── self-perception.ts
│   ├── demand-recognition.ts
│   └── deviation-correction.ts
├── memory/             # 4-layer memory system
│   ├── semantic-memory.ts
│   ├── program-memory.ts
│   ├── episodic-memory.ts
│   └── working-memory.ts
├── learning/           # Autonomous learning
│   └── path-planner.ts
└── index.ts           # Unified entry
```

---

## 🎨 Theme

- **Logo**: 👾 (Alien)
- **Theme Color**: Blue-Purple Gradient
- **Developer**: [MarkEllington](https://x.com/moralesjavx1032) (14 years old)

---

## 🤝 Community

- **Discord**: https://discord.gg/FKXPBAtPwG
- **Twitter**: https://x.com/moralesjavx1032

---

## 📄 License

MIT License

---

_Built with ❤️ by MarkEllington (14yo)_

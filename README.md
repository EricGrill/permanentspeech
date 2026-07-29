# PermanentSpeech

> Write once. Never rewritten.

PermanentSpeech is a permissionless publishing application that allows users to permanently inscribe short-form speech onto the Bitcoin blockchain using OP_RETURN.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bitcoin](https://img.shields.io/badge/Bitcoin-OP_RETURN-orange.svg)](https://bitcoin.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## What is PermanentSpeech?

PermanentSpeech provides a censorship-resistant publication mechanism with cryptographically verifiable proof-of-publication. It is a neutral tool that does not moderate or curate on-chain content.

### Key Features

- **Permissionless**: No account required, no approval process
- **Non-Custodial**: Users control their keys; no funds or private keys ever touch the server
- **Immutable**: Content is permanently recorded on the Bitcoin blockchain
- **Verifiable**: Trivial and transparent verification of published content

## How It Works

1. **Enter Text**: User enters text into the editor
2. **Review**: App displays byte size, estimated fee, and permanence warning
3. **Sign**: User signs the transaction with their wallet
4. **Broadcast**: Transaction is broadcast to the Bitcoin network
5. **Verify**: Content can be verified via transaction ID

## Tech Stack

### Frontend
- React/Next.js
- Client-side transaction building
- WASM-based Bitcoin libraries

### Backend
- Node.js
- Bitcoin Core full node
- Broadcast + fee estimation

## Quick Start

```bash
# Clone the repository
git clone https://github.com/EricGrill/permanentspeech.git
cd permanentspeech

# Install dependencies
npm install

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Run development server
npm run dev
```

## Project Structure

```
permanentspeech/
├── backend/          # Node.js backend service
├── frontend/         # React frontend application
├── docs/            # Documentation
└── plan.MD          # Product requirements document
```

## Payload Specification

### On-Chain Payload (Binary)
```
[Magic Bytes][Version][Content Type][Encoding][Payload]
```

Example:
- Magic: `PSP1`
- Version: `0x01`
- Content Type: `0x01` (plain text)
- Encoding: `0x01` (UTF-8)
- Payload: text bytes

## Safety & Legal Considerations

### Immutable Reality Disclosure

**Important**: Content published via PermanentSpeech will be permanently recorded on the Bitcoin blockchain and cannot be removed or altered.

### Platform Stance

- PermanentSpeech.com does not create or control content
- The platform provides tooling only
- No content moderation or censorship

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for the Bitcoin community
- Inspired by the need for censorship-resistant communication

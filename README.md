# PermanentSpeech

Permissionless publishing to Bitcoin via OP_RETURN.

## Overview

PermanentSpeech is a platform for immutable, censorship-resistant publishing on the Bitcoin blockchain. It allows users to store text and data permanently using Bitcoin's OP_RETURN feature.

## Features

- **Permissionless Publishing**: No accounts or permissions required
- **Bitcoin Native**: Uses OP_RETURN for data storage
- **Immutable**: Once published, content cannot be altered or removed
- **Backend API**: Express.js API for handling publishing requests
- **Rate Limiting**: Built-in protection against spam

## Project Structure

```
permanentspeech/
├── backend/          # Express.js API server
├── frontend/         # Web interface
├── docs/            # Documentation
└── .claude/         # Claude-specific configuration
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Bitcoin node (for full functionality)

### Backend Setup

```bash
cd backend

# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```bash
cp backend/.env.example backend/.env
```

Required variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `BITCOIN_RPC_URL` | Bitcoin RPC endpoint | Yes |
| `BITCOIN_RPC_USER` | RPC username | Yes |
| `BITCOIN_RPC_PASS` | RPC password | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | No (default: 900000) |
| `RATE_LIMIT_MAX` | Max requests per window | No (default: 100) |

## API Endpoints

### POST /publish

Publish content to Bitcoin blockchain.

**Request:**
```json
{
  "content": "Your text to publish"
}
```

**Response:**
```json
{
  "txid": "abc123...",
  "blockHeight": 1234567,
  "timestamp": "2026-01-26T10:00:00Z"
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Disclaimer

This project interacts with the Bitcoin blockchain. All transactions are irreversible. Use at your own risk.

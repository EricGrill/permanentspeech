Product Requirements Document (PRD)
Product Name

permanentspeech.com

Tagline (working)

Write once. Never rewritten.

1. Purpose & Vision

permanentspeech.com is a permissionless publishing application that allows users to permanently inscribe short-form speech onto the Bitcoin blockchain using OP_RETURN.

The product exists to provide:

A censorship-resistant publication mechanism

A cryptographically verifiable proof-of-publication

A neutral tool that does not moderate or curate on-chain content

The application does not host content in the traditional sense. It enables users to commit data to Bitcoin and provides tools to read and verify that data.

2. Problem Statement

Modern speech platforms:

Can remove, alter, or deplatform content retroactively

Depend on centralized moderation and policy enforcement

Cannot provide durable, timestamped proof that content existed at a given moment

Bitcoin already provides:

Global consensus

Immutable ordering

Timestamped permanence

But there is no clean, non-custodial, user-friendly interface for committing human-readable speech directly to Bitcoin.

3. Goals
Primary Goals

Allow users to publish immutable speech using Bitcoin OP_RETURN

Keep the system fully non-custodial

Make verification trivial and transparent

Non-Goals

Hosting long-form blogs directly on-chain

Content moderation or censorship

Custody of funds or private keys

Social media engagement mechanics (likes, follows) in v1

4. Target Users
Primary Users

Developers

Journalists

Researchers

Activists

Archivists

Bitcoin-native users

Secondary Users

Anyone who wants durable proof that something was said at a specific time

5. Core Principles

Permissionless

No account required

No approval process

Non-Custodial

Users control their keys

No funds or private keys ever touch the server

Minimal

Only what is required to publish and verify

Honest UX

Explicit warnings about permanence and irreversibility

6. Functional Requirements
6.1 Publishing Flow

User Journey

User enters text into editor

App displays:

Byte size

Estimated fee

Clear permanence warning

App constructs unsigned transaction or PSBT

User signs with their wallet

Transaction is broadcast

User receives:

txid

canonical reader URL

Requirements

Enforce byte limit based on current policy

Display raw bytes that will be committed

Support UTF-8 text encoding

Allow optional metadata:

Title (off-chain)

Language

Content type (plain text, markdown)

6.2 Transaction Construction

Support single and multiple OP_RETURN outputs

Support adjustable fee rates

Allow user-supplied UTXOs (advanced mode)

Default to conservative relay-compatible settings

6.3 Wallet Interaction

Supported Methods

PSBT export

Raw transaction hex export

Browser wallet integration where available

Requirements

No private key handling

Clear signing instructions

Fallback path if wallet integration fails

6.4 Broadcast

Primary: self-hosted Bitcoin node

Fallback: multiple broadcast relays

Show broadcast status and confirmation state

6.5 Reader / Verifier

Reader Page

URL pattern:
/tx/{txid}

Features

Decode and display OP_RETURN payload

Show:

Block height

Timestamp

Transaction hash

Display raw hex and decoded text

Link to multiple block explorers

Client-side content warnings

Important

Reader must be stateless

No caching of content required

7. Payload Specification
On-Chain Payload (Binary)
[Magic Bytes][Version][Content Type][Encoding][Payload]


Example:

Magic: PSP1

Version: 0x01

Content Type: 0x01 (plain text)

Encoding: 0x01 (UTF-8)

Payload: text bytes

Off-Chain Metadata (Optional)

Title

Author alias

Tags

Stored only in URL or client-side state

8. Safety & Legal Considerations
Immutable Reality Disclosure

Mandatory confirmation:

“This content will be permanently recorded on the Bitcoin blockchain and cannot be removed or altered.”

Platform Stance

permanentspeech.com does not create or control content

The platform provides tooling only

Search and discovery (if added later) is optional and filterable

Server Behavior

Do not store plaintext messages

Do not log payload content

Do not index content by default

9. Non-Functional Requirements
Security

HTTPS only

Strict CSP

No third-party trackers

Performance

Page loads under 1 second

Reader pages must function without backend dependency

Availability

Publishing works even if reader services are down

txid is sufficient for verification elsewhere

10. Tech Stack (Suggested)
Frontend

React or Next.js

Client-side transaction building

WASM-based Bitcoin libs where possible

Backend

Minimal Node.js service

Bitcoin Core full node

Broadcast + fee estimation only

Infrastructure

Self-hosted Bitcoin node

No database required for MVP

11. MVP Scope
Included

Text publishing

PSBT generation

Broadcast

tx reader page

Excluded

Search

User accounts

Profiles

Threading

Monetization

12. Future Enhancements

Hash-only anchoring mode

IPFS / Nostr pointer support

Author identity via signed key claims

Threading via tx references

Optional curated indexes

API for external publishers

13. Success Metrics

Number of successful publishes

Percentage of fully non-custodial flows

Time to publish

Zero custody incidents

14. Risks

Relay policy variability

Hosting provider pressure

Misuse of permanence

User misunderstanding of irreversibility

Mitigation: transparency, minimalism, and user responsibility.

# Solana Stake

A Solana staking program built with [Anchor](https://www.anchor-lang.com/) that enables users to stake SOL and earn points over time.

## Features

- **Stake SOL** – Deposit SOL into a personal staking account
- **Unstake SOL** – Withdraw staked SOL at any time
- **Earn Points** – Accumulate points based on staking duration and amount
- **Claim Points** – Claim accumulated staking rewards
- **View Points** – Check current point balance without modifying state

## Tech Stack

- **Language**: Rust
- **Framework**: [Anchor](https://www.anchor-lang.com/) v0.31.1
- **Blockchain**: Solana
- **Testing**: TypeScript with Mocha & Chai

## Program Architecture

### Account Structure

```rust
pub struct StakeAccount {
    pub owner: Pubkey,           // 32 bytes - Owner's public key
    pub staked_amount: u64,      // 8 bytes  - Amount of SOL staked (in lamports)
    pub total_points: u64,       // 8 bytes  - Accumulated points
    pub last_updated_time: i64,  // 8 bytes  - Last update timestamp
    pub bump: u8                 // 1 byte   - PDA bump seed
}
```

### Instructions

| Instruction     | Description                                      |
|-----------------|--------------------------------------------------|
| `create_pda`    | Initialize a new staking account for a user     |
| `stake`         | Stake SOL into the staking account              |
| `unstake`       | Withdraw SOL from the staking account           |
| `claim_points`  | Claim and reset accumulated points              |
| `get_points`    | View current point balance (read-only)          |

### Points Calculation

Points are calculated based on the formula:

```
points = (staked_amount × time_elapsed × POINTS_PER_SOL_PER_DAY) / (LAMPORTS_PER_SOL × SECONDS_PER_DAY)
```

**Rate**: 1,000,000 points per SOL per day

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (v0.31.1)
- [Node.js](https://nodejs.org/) (v18+)
- [Yarn](https://yarnpkg.com/)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/solana-stake.git
   cd solana-stake
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Build the program**

   ```bash
   anchor build
   ```

## Testing

Run the test suite:

```bash
anchor test
```

Or run tests with specific options:

```bash
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

## Deployment

### Localnet

1. Start a local validator:

   ```bash
   solana-test-validator
   ```

2. Deploy the program:

   ```bash
   anchor deploy
   ```

### Devnet

1. Configure Solana CLI for devnet:

   ```bash
   solana config set --url devnet
   ```

2. Update `Anchor.toml`:

   ```toml
   [provider]
   cluster = "devnet"
   ```

3. Deploy:

   ```bash
   anchor deploy
   ```

## Project Structure

```
solana-stake/
├── programs/
│   └── solana-stake/
│       └── src/
│           └── lib.rs       # Main program logic
├── tests/
│   └── solana-stake.ts      # Integration tests
├── app/                     # Frontend application (if any)
├── migrations/              # Deployment scripts
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Rust workspace config
└── package.json             # Node.js dependencies
```

## Security

The program includes the following security measures:

- **Owner validation** – Only account owners can perform stake operations
- **Overflow/Underflow protection** – All arithmetic operations use checked math
- **Amount validation** – Prevents zero-amount transactions
- **PDA-based security** – Uses Program Derived Addresses for secure account management

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

=

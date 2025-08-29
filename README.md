# voting

## Getting Started

This repo is meant to be used via `npx create-solana-dapp --template robertohuertasm/solana-template`.

It's a template for Solana dApps based on [solana-developers/template-next-tailwind-counter](https://github.com/solana-developers/template-next-tailwind-counter), but with a few improvements:

- Support for Rust Analyzer in VS Code.
- Removes `cfg` warnings.
- Adds a `blink` to the API.
- Voting app with JS and Rust tests.

### Prerequisites

- Node v22 or higher
- Rust v1.89.0 or higher
- Anchor CLI 0.31.1 or higher
- Solana CLI 3.0.0 or higher

### Installation

Clone the repo:

```shell
git clone <repo-url>
cd <repo-name>
```

or just use `npx create-solana-dapp --template robertohuertasm/solana-template`.

#### Install Dependencies

Go to the `package.json` file and change the name of your app. That's the only thing that you'll need to change as `create-solana-dapp` will replace the `template` string with the name of your app.

Then install the dependencies:

```shell
npm install
```

#### Start the web app

```
npm run dev
```

## Apps

### anchor

This is a Solana program written in Rust using the Anchor framework.

#### Commands

You can use any normal anchor commands. Either move to the `anchor` directory and run the `anchor` command or prefix the command with `npm`, eg: `npm run anchor`.

#### Sync the program id:

Running this command will create a new keypair in the `anchor/target/deploy` directory and save the address to the Anchor config file and update the `declare_id!` macro in the `./src/lib.rs` file of the program.

You will manually need to update the constant in `anchor/src/voting-exports.ts` to match the new program id.

```shell
npm run anchor keys sync
```

#### Build the program:

```shell
npm run anchor-build
```

#### Start the test validator with the program deployed:

```shell
npm run anchor-localnet
```

If you want to use your local validator, you'll need to deploy the contract: `npm run anchor deploy`.

#### Run the tests

```shell
npm run anchor-test
```

#### Deploy to Devnet

```shell
npm run anchor deploy --provider.cluster devnet
```

### web

This is a React app that uses the Anchor generated client to interact with the Solana program.

#### Commands

Start the web app

```shell
npm run dev
```

Build the web app

```shell
npm run build
```

## Blinks

There's a blink in the `api > vote > routes.ts` file.

## Tests

We have bankrun tests, normal tests, and Rust tests (`npm run test-rust`)

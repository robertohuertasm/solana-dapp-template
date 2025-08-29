import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Voting } from '../target/types/voting';

import { startAnchor } from 'solana-bankrun';
import { BankrunProvider } from 'anchor-bankrun';

const IDL = require('../target/idl/voting.json');
const PROGRAM_ID = new PublicKey(IDL.address);

describe('voting.bankrun.test', () => {
  async function setup() {
    const context = await startAnchor('', [{ name: 'voting', programId: PROGRAM_ID }], []);
    const provider = new BankrunProvider(context);

    const payer = provider.wallet as anchor.Wallet;
    const program = new anchor.Program<Voting>(IDL, provider);

    return { context, provider, payer, program };
  }

  function localValidatorSetup() {
    // NOTE: Anchor will use the wallet as the default signer.
    // const payer = provider.wallet;
    program = anchor.workspace.Voting as Program<Voting>;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  }

  let program: Program<Voting>;

  beforeAll(async () => {
    // bankrun setup
    const { program: _program } = await setup();
    program = _program;

    // uncomment the line below is you wan to run against your solana-test-validator
    // remember to run `anchor test --skip-build --skip-deploy --skip-local-validator
    // localValidatorSetup();
  });

  it('should initialize a poll', async () => {
    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const tx = await program.methods
      .initializePoll(
        new anchor.BN(1),
        'What is your favourite color?',
        new anchor.BN(Date.now()),
        new anchor.BN(Date.now() + 1000000),
      )
      .rpc();

    const currentPoll = await program.account.poll.fetch(pollAddress);

    expect(currentPoll.pollId.eq(new anchor.BN(1))).toBeTruthy();
    expect(currentPoll.description).toEqual('What is your favourite color?');
  });

  it('should initialize a candidate', async () => {
    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    let tx = await program.methods
      .initializeCandidate('red', new anchor.BN(1))
      .accountsPartial({
        poll: pollAddress,
      })
      .rpc();

    tx = await program.methods
      .initializeCandidate('green', new anchor.BN(1))
      .accountsPartial({
        poll: pollAddress,
      })
      .rpc();

    const [redAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('red'), new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const [greenAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('green'), new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const red = await program.account.candidate.fetch(redAddress);
    const green = await program.account.candidate.fetch(greenAddress);

    const currentPoll = await program.account.poll.fetch(pollAddress);

    expect(red.candidateName).toEqual('red');
    expect(red.candidateVotes.toNumber()).toEqual(0);
    expect(green.candidateName).toEqual('green');
    expect(green.candidateVotes.toNumber()).toEqual(0);
    expect(currentPoll.candidateAmount.toNumber()).toEqual(2);
  });

  it('should vote for a candidate', async () => {
    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const [redAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('red'), new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const tx = await program.methods
      .vote('red', new anchor.BN(1))
      .accountsPartial({
        poll: pollAddress,
        candidate: redAddress,
      })
      .rpc();

    const red = await program.account.candidate.fetch(redAddress);

    expect(red.candidateName).toEqual('red');
    expect(red.candidateVotes.toNumber()).toEqual(1);
  });
});

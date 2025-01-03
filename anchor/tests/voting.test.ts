import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Voting } from '../target/types/voting';

describe('voting.basic.test', () => {
  async function setup() {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // NOTE: Anchor will use the wallet as the default signer.
    const payer = provider.wallet;
    const program = anchor.workspace.Votingapp as Program<Voting>;

    return { provider, payer, program };
  }

  it('should initialize a poll', async () => {
    const { program } = await setup();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    // console.log('Address', pollAddress);

    const tx = await program.methods
      .initializePoll(
        new anchor.BN(1),
        'What is your favourite color?',
        new anchor.BN(Date.now()),
        new anchor.BN(Date.now() + 1000000),
      )
      // NOTE: anchor does all this implicitly
      // .accountsPartial({
      //   signer: payer.publicKey,
      //   poll: pollAddress,
      // })
      // .signers([payer.payer])
      .rpc();

    // console.log('Your transaction signature', tx);

    const currentPoll = await program.account.poll.fetch(pollAddress);

    // console.log('Current Poll', currentPoll);

    expect(currentPoll.pollId.eq(new anchor.BN(1))).toBeTruthy();
    expect(currentPoll.description).toEqual('What is your favourite color?');
    expect(currentPoll.candidateAmount.toNumber()).toEqual(0);
  });

  it('should initialize a candidate', async () => {
    const { program } = await setup();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    // console.log('Address', pollAddress);

    let tx = await program.methods
      .initializeCandidate('Roberto', new anchor.BN(1))
      .accountsPartial({
        poll: pollAddress,
      })
      .rpc();

    // console.log('Your transaction signature', tx);

    tx = await program.methods
      .initializeCandidate('Nicolas', new anchor.BN(1))
      .accountsPartial({
        poll: pollAddress,
      })
      .rpc();

    // console.log('Your transaction signature', tx);

    const [robertoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('Roberto'), new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const [nicolasAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('Nicolas'), new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const roberto = await program.account.candidate.fetch(robertoAddress);
    const nicolas = await program.account.candidate.fetch(nicolasAddress);

    const currentPoll = await program.account.poll.fetch(pollAddress);

    expect(roberto.candidateName).toEqual('Roberto');
    expect(roberto.candidateVotes.toNumber()).toEqual(0);
    expect(nicolas.candidateName).toEqual('Nicolas');
    expect(nicolas.candidateVotes.toNumber()).toEqual(0);
    expect(currentPoll.candidateAmount.toNumber()).toEqual(2);
  });

  it('should vote for a candidate', async () => {
    const { program } = await setup();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const [robertoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('Roberto'), new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      program.programId,
    );

    const tx = await program.methods
      .vote('Roberto', new anchor.BN(1))
      .accountsPartial({
        poll: pollAddress,
        candidate: robertoAddress,
      })
      .rpc();

    // console.log('transaction', tx);

    const roberto = await program.account.candidate.fetch(robertoAddress);

    console.log(roberto);

    expect(roberto.candidateName).toEqual('Roberto');
    expect(roberto.candidateVotes.toNumber()).toEqual(1);
  });
});

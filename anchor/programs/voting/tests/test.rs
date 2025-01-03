use std::vec;

use anchor_lang::prelude::*;
use solana_program::hash::Hash;
use solana_program_test::{BanksClient, ProgramTest};
use solana_sdk::{signature::Keypair, signer::Signer, transaction::Transaction};

use anchor_lang::InstructionData;
use solana_program_test::*;
use solana_sdk::instruction::Instruction;
use voting::{instruction, Candidate, Poll};

// define poll parameters
const POLL_ID: u64 = 1;
const DESCRIPTION: &str = "What is your favourite color?";
const POLL_START: u64 = 1234567890;
const POLL_END: u64 = POLL_START + 1000000;
const CANDIDATE_NAME: &str = "Roberto";

async fn setup() -> (BanksClient, Keypair, Hash) {
    let mut program_test = ProgramTest::new("voting", voting::ID, None);
    program_test.prefer_bpf(true);
    program_test.start().await
}

async fn create_poll(banks: &mut BanksClient, payer: &Keypair, blockhash: Hash) -> Pubkey {
    // get the poll PDA
    let poll_id_as_bytes = POLL_ID.to_le_bytes();
    let poll_seeds = &[poll_id_as_bytes.as_ref()];
    let (poll_address, _bump) = Pubkey::find_program_address(poll_seeds, &voting::ID);

    // create the instruction
    let ix = Instruction {
        program_id: voting::ID,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(poll_address, false),
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: instruction::InitializePoll {
            poll_id: POLL_ID,
            description: DESCRIPTION.to_string(),
            poll_start: POLL_START,
            poll_end: POLL_END,
        }
        .data(),
    };

    // execute the transaction
    let transaction =
        Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], blockhash);

    banks.process_transaction(transaction).await.unwrap();

    poll_address
}

async fn create_candidate(
    banks: &mut BanksClient,
    payer: &Keypair,
    blockhash: Hash,
    poll_address: Pubkey,
) -> Pubkey {
    // get the candidate PDA
    let poll_id_as_bytes = POLL_ID.to_le_bytes();
    let candidate_seeds = &[CANDIDATE_NAME.as_bytes(), poll_id_as_bytes.as_ref()];
    let (candidate_address, _bump) = Pubkey::find_program_address(candidate_seeds, &voting::ID);

    // create the instruction
    let ix = Instruction {
        program_id: voting::ID,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(poll_address, false),
            AccountMeta::new(candidate_address, false),
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: instruction::InitializeCandidate {
            candidate_name: CANDIDATE_NAME.to_string(),
            poll_id: POLL_ID,
        }
        .data(),
    };

    // execute the transaction
    let transaction =
        Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], blockhash);

    banks.process_transaction(transaction).await.unwrap();

    candidate_address
}

#[tokio::test]
async fn should_initialize_poll() {
    // setup test
    let (mut banks, payer, blockhash) = setup().await;

    let poll_address = create_poll(&mut banks, &payer, blockhash.clone()).await;

    // fetch and verify the poll account
    let poll_account = banks.get_account(poll_address).await.unwrap().unwrap();

    let poll = Poll::try_deserialize(&mut poll_account.data.as_slice()).unwrap();

    // assertions
    assert_eq!(poll.poll_id, POLL_ID);
    assert_eq!(poll.description, DESCRIPTION.to_string());
    assert_eq!(poll.poll_start, POLL_START);
    assert_eq!(poll.poll_end, POLL_END);
    assert_eq!(poll.candidate_amount, 0);
}

#[tokio::test]
async fn should_initialize_candidate() {
    // setup test
    let (mut banks, payer, blockhash) = setup().await;

    // create poll
    let poll_address = create_poll(&mut banks, &payer, blockhash.clone()).await;

    // create the candidate
    let candidate_address =
        create_candidate(&mut banks, &payer, blockhash.clone(), poll_address).await;

    // fetch and verify the poll account
    let poll_account = banks.get_account(poll_address).await.unwrap().unwrap();

    let poll = Poll::try_deserialize(&mut poll_account.data.as_slice()).unwrap();

    let roberto_account = banks.get_account(candidate_address).await.unwrap().unwrap();

    let roberto = Candidate::try_deserialize(&mut roberto_account.data.as_slice()).unwrap();

    // assertions
    assert_eq!(poll.poll_id, POLL_ID);
    assert_eq!(poll.candidate_amount, 1);

    assert_eq!(roberto.candidate_name, CANDIDATE_NAME.to_string());
    assert_eq!(roberto.candidate_votes, 0);
}

#[tokio::test]
async fn should_vote() {
    // setup test
    let (mut banks, payer, blockhash) = setup().await;

    // create poll
    let poll_address = create_poll(&mut banks, &payer, blockhash.clone()).await;

    // create the candidate
    let candidate_address =
        create_candidate(&mut banks, &payer, blockhash.clone(), poll_address).await;

    // instruction
    let ix = Instruction {
        program_id: voting::ID,
        accounts: vec![
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new(poll_address, false),
            AccountMeta::new(candidate_address, false),
        ],
        data: instruction::Vote {
            _candidate_name: CANDIDATE_NAME.to_string(),
            _poll_id: POLL_ID,
        }
        .data(),
    };

    let transaction =
        Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], blockhash);

    banks.process_transaction(transaction).await.unwrap();

    let roberto_account = banks.get_account(candidate_address).await.unwrap().unwrap();

    let roberto = Candidate::try_deserialize(&mut roberto_account.data.as_slice()).unwrap();

    // assertions

    assert_eq!(roberto.candidate_name, CANDIDATE_NAME.to_string());
    assert_eq!(roberto.candidate_votes, 1);
}

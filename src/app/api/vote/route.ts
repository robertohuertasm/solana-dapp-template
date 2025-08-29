import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from '@solana/actions';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Voting } from '@/../anchor/target/types/voting';
import { BN, Program } from '@coral-xyz/anchor';

const IDL = require('@/../anchor/target/idl/voting.json');

export const OPTIONS = GET;

export async function GET(request: Request) {
  const actionMetadata: ActionGetResponse = {
    icon: 'https://th.bing.com/th/id/OIP.f2USz_gt9d41oURf6qYkzQHaEK?rs=1&pid=ImgDetMain',
    title: 'Vote for your favourite color',
    description: 'Vote between Red and Green',
    label: 'Vote',
    links: {
      actions: [
        {
          label: 'Vote for Red',
          href: '/api/vote?candidate=red',
          type: 'post',
        },
        {
          label: 'Vote for Green',
          href: '/api/vote?candidate=green',
          type: 'post',
        },
      ],
    },
  };

  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const candidate = url.searchParams.get('candidate');

  if (candidate !== 'red' && candidate !== 'green') {
    return Response.json({ error: 'No candidate provided' }, { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  const body: ActionPostRequest = await request.json();

  let voter;

  try {
    voter = new PublicKey(body.account);
  } catch (error) {
    return new Response('Invalid Account', {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const program: Program<Voting> = new Program(IDL, { connection });

  const instruction = await program.methods
    .vote(candidate, new BN(1))
    .accountsPartial({
      signer: voter,
    })
    .instruction();

  const blockhash = await connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: voter,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }).add(instruction);

  const response = await createPostResponse({
    fields: {
      transaction: transaction,
      type: 'transaction',
    },
  });

  return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
}

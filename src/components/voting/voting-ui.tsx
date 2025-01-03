'use client';

import { Keypair, PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import { ellipsify } from '../ui/ui-layout';
import { ExplorerLink } from '../cluster/cluster-ui';
import {
  useInitializePollAndCandidates,
  useVotingProgram,
  useVotingProgramAccount,
} from './voting-data-access';
import { BN } from 'bn.js';

export function VotingCreate() {
  const { initializePollAndCandidates, isPending } =
    useInitializePollAndCandidates();

  const { polls } = useVotingProgram();
  const pollCount = useMemo(
    () => polls.data?.length ?? 0,
    [polls.data?.length],
  );

  return (
    <button
      className="btn btn-xs lg:btn-md btn-primary"
      onClick={() => initializePollAndCandidates()}
      disabled={isPending || pollCount >= 1}
    >
      Initialize Poll and Candidates {isPending && '...'}
    </button>
  );
}

export function VotingList() {
  const { polls, programAccount } = useVotingProgram();

  if (programAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }

  if (!programAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>
          Program account not found. Make sure you have deployed the program and
          are on the correct cluster.
        </span>
      </div>
    );
  }

  return (
    <div className={'space-y-6'}>
      {polls.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : polls.data?.length ? (
        <div className="grid md:grid-cols-1 gap-4">
          {polls.data?.map((poll) => (
            <PollCard
              key={poll.publicKey.toString()}
              pollAddress={poll.publicKey}
            />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No polls</h2>
          No polls found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

function PollCard({ pollAddress }: { pollAddress: PublicKey }) {
  const { pollQuery, voteMutation } = useVotingProgramAccount({
    pollAddress,
  });

  const candidateAmount = useMemo(
    () => pollQuery.data?.poll.candidateAmount ?? new BN(0),
    [pollQuery.data?.poll.candidateAmount],
  );

  const description = useMemo(
    () =>
      pollQuery.data?.poll.description ??
      'The description of the poll has not been set',
    [pollQuery.data?.poll.description],
  );

  return pollQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg content-center"></span>
  ) : (
    <div className="card card-bordered border-base-300 border-4 text-neutral-content">
      <div className="card-body items-center text-center">
        <div className="space-y-6">
          <h2
            className="card-title justify-center text-3xl cursor-pointer"
            onClick={() => pollQuery.refetch()}
          >
            {description}
          </h2>
          <div className="flex justify-center">
            <p className="text-2xl">Candidates: {candidateAmount.toNumber()}</p>
            {/* <p className="text-2xl">
              Details: {JSON.stringify(pollQuery.data)}
            </p> */}
          </div>

          <div className="card-actions justify-around py-8">
            {pollQuery.data?.candidates.map((candidate) => (
              <div key={candidate.account.candidateName}>
                <p>
                  {candidate.account.candidateName}:{' '}
                  {candidate.account.candidateVotes.toNumber()}
                </p>
                <button
                  className="btn btn-xs lg:btn-md btn-outline"
                  onClick={() =>
                    voteMutation.mutateAsync({
                      name: candidate.account.candidateName,
                      pollId: candidate.account.pollId,
                      candidateAddress: candidate.publicKey,
                    })
                  }
                  disabled={voteMutation.isPending}
                >
                  Vote for {candidate.account.candidateName}
                </button>
              </div>
            ))}
          </div>
          <div className="text-center space-y-4 pt-10">
            <p>
              <ExplorerLink
                path={`account/${pollAddress}`}
                label={ellipsify(pollAddress.toString())}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

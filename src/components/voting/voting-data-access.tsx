'use client';

import { getVotingProgram, getVotingProgramId } from '@project/anchor';
import { useConnection } from '@solana/wallet-adapter-react';
import { Cluster, Keypair, PublicKey } from '@solana/web3.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { use, useCallback, useMemo, useState } from 'react';
import { useCluster } from '../cluster/cluster-data-access';
import { useAnchorProvider } from '../solana/solana-provider';
import { useTransactionToast } from '../ui/ui-layout';
import BN from 'bn.js';
import { utils } from '@coral-xyz/anchor';

const POLLID = 1;

const pollIdToBase58 = (pollId: BN): string => {
  const buffer = Buffer.from(pollId.toArray('le', 8));
  const bytes = utils.bytes.bs58.encode(buffer);
  return bytes;
};

export function useVotingProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const provider = useAnchorProvider();
  const queryClient = useQueryClient();

  const invalidatePollQuery = useCallback(
    (pollAddress: PublicKey) => {
      queryClient.invalidateQueries({
        queryKey: ['voting', 'pollQuery', { cluster, pollAddress }],
        exact: true,
      });
    },
    [queryClient, cluster],
  );

  const programId = useMemo(
    () => getVotingProgramId(cluster.network as Cluster),
    [cluster],
  );

  const program = useMemo(
    () => getVotingProgram(provider, programId),
    [provider, programId],
  );

  const polls = useQuery({
    queryKey: ['voting', 'all', { cluster }],
    queryFn: () => program.account.poll.all(),
  });

  const programAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  return {
    program,
    programId,
    programAccount,
    polls,
    invalidatePollQuery,
  };
}

export function useInitializePollAndCandidates() {
  const { program, polls, invalidatePollQuery } = useVotingProgram();
  const transactionToast = useTransactionToast();
  const [isPending, setIsPending] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializePoll = useMutation({
    mutationKey: ['voting', 'initialize_poll'],
    mutationFn: () =>
      program.methods
        .initializePoll(
          new BN(POLLID),
          'What is your favourite color?',
          new BN(Date.now()),
          new BN(Date.now() + 10000000),
        )
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return polls.refetch();
    },
  });

  const initializeCandidates = useMutation({
    mutationKey: ['voting', 'initialize_candidates'],
    mutationFn: ({ name, pollId }: { name: string; pollId: number }) =>
      program.methods.initializeCandidate(name, new BN(pollId)).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return polls.refetch();
    },
  });

  const initializePollAndCandidates = useCallback(async () => {
    setIsPending(true);
    try {
      // Initialize the poll
      const pollSignature = await initializePoll.mutateAsync();
      console.log('Poll initialized:', pollSignature);

      const newPoll = await program.account.poll.all([
        {
          memcmp: {
            offset: 8,
            bytes: pollIdToBase58(new BN(POLLID)),
          },
        },
      ]);

      // Initialize candidates sequentially
      const candidateNames = ['Red', 'Green'];
      for (const name of candidateNames) {
        const candidateSignature = await initializeCandidates.mutateAsync({
          name,
          pollId: POLLID,
        });
        console.log(`Candidate ${name} initialized:`, candidateSignature);
      }

      invalidatePollQuery(newPoll[0].publicKey);
    } catch (error) {
      console.error('Error initializing poll and candidates:', error);
    } finally {
      setIsPending(false);
      setIsInitialized(true);
    }
  }, [
    initializePoll,
    initializeCandidates,
    invalidatePollQuery,
    program.account.poll,
  ]);

  return { initializePollAndCandidates, isPending, isInitialized };
}

export function useVotingProgramAccount({
  pollAddress,
}: {
  pollAddress: PublicKey;
}) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program } = useVotingProgram();

  const pollQuery = useQuery({
    queryKey: ['voting', 'pollQuery', { cluster, pollAddress }],
    queryFn: async () => {
      const poll = await program.account.poll.fetch(pollAddress);

      const candidates = await program.account.candidate.all([
        {
          memcmp: {
            offset: 8,
            bytes: pollIdToBase58(poll.pollId),
          },
        },
      ]);

      return {
        poll,
        candidates,
      };
    },
  });

  // program.provider.connection
  //   .getAccountInfo(
  //     new PublicKey('DnRiLFyEvtaSYj6bMS45nbVZnpUdgfu1WM97MdaoYkSc'),
  //   )
  //   .then((accountInfo) => {
  //     console.log(accountInfo);
  //     const rawData = accountInfo?.data.toString('hex');
  //     console.log('Raw account data (hex):', rawData);
  //   });

  const voteMutation = useMutation({
    mutationKey: ['voting', 'vote', { cluster, pollAddress }],
    mutationFn: ({
      name,
      pollId,
      candidateAddress,
    }: {
      name: string;
      pollId: BN;
      candidateAddress: PublicKey;
    }) =>
      program.methods
        .vote(name, pollId)
        // the accounts are not needed but...
        .accountsPartial({ poll: pollAddress, candidate: candidateAddress })
        .rpc(),
    onSuccess: (tx) => {
      transactionToast(tx);
      return pollQuery.refetch();
    },
  });

  return {
    pollQuery,
    voteMutation,
  };
}

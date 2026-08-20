"use client";

import { useQuery } from "@tanstack/react-query";

import { boardQueryKeys, boardsApi } from "@/features/boards/api/boards-api";
import type { Board } from "@/features/boards/types";

/*
 * D-12/D-13 ordering, resolved by 02-BACKEND-FACTS.md's Task 4 checkpoint decision
 * ("ordering-developer-choice"): `GET /boards` observed returns creation order (oldest-first) —
 * neither this endpoint nor `BoardResponseDTO` exposes a timestamp to sort by instead, so the
 * decided treatment is reversing the fetched array client-side for newest-first, rather than a
 * second, independently-maintained id-comparison function.
 */
const newestFirst = (boards: Board[]): Board[] => [...boards].reverse();

export const useBoards = () =>
    useQuery({
        queryKey: boardQueryKeys.all,
        queryFn: boardsApi.list,
        select: newestFirst,
    });

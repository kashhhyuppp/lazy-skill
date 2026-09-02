import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient, getUser } from "@/lib/supabase/server";
import { levelProgress, type LevelProgress } from "@/lib/gamification/levels";
import { questForDate, todayUtc } from "@/lib/gamification/rules";

export interface QuestState {
  code: string;
  label: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface PlayerState {
  signedIn: boolean;
  level: LevelProgress;
  currentStreak: number;
  longestStreak: number;
  /** UTC dates (YYYY-MM-DD) with at least one recorded action. */
  activeDays: string[];
  quest: QuestState;
  unlocked: Set<string>;
}

function guestState(): PlayerState {
  const quest = questForDate();
  return {
    signedIn: false,
    level: levelProgress(0),
    currentStreak: 0,
    longestStreak: 0,
    activeDays: [],
    quest: { code: quest.code, label: quest.label, progress: 0, target: quest.target, completed: false },
    unlocked: new Set(),
  };
}

/**
 * Everything the gamification UI needs, in one round trip per table.
 * Signed-out visitors get a genuine zero state rather than invented numbers.
 */
export async function getPlayerState(): Promise<PlayerState> {
  const user = await getUser();
  if (!user) return guestState();

  const supabase = await createClient();
  if (!supabase) return guestState();

  const quest = questForDate();
  const since = new Date(Date.now() - 27 * 86_400_000).toISOString();

  const [profileRes, questRes, achievementRes, activityRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("total_xp, current_streak, longest_streak")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("quest_progress")
      .select("progress, target, completed_at")
      .eq("user_id", user.id)
      .eq("quest_date", todayUtc())
      .eq("quest_code", quest.code)
      .maybeSingle(),
    supabase.from("user_achievements").select("code").eq("user_id", user.id),
    supabase.from("xp_events").select("created_at").eq("user_id", user.id).gte("created_at", since),
  ]);

  const profile = profileRes.data;
  const activeDays = new Set<string>();
  for (const row of activityRes.data ?? []) {
    activeDays.add(String(row.created_at).slice(0, 10));
  }

  return {
    signedIn: true,
    level: levelProgress(profile?.total_xp ?? 0),
    currentStreak: profile?.current_streak ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    activeDays: [...activeDays],
    quest: {
      code: quest.code,
      label: quest.label,
      progress: questRes.data?.progress ?? 0,
      target: questRes.data?.target ?? quest.target,
      completed: Boolean(questRes.data?.completed_at),
    },
    unlocked: new Set((achievementRes.data ?? []).map((r) => String(r.code))),
  };
}

export interface LeaderboardRow {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  totalXp: number;
  currentStreak: number;
  rank: number;
}

/**
 * Real players only. When the board is thin we say so rather than padding it
 * with invented accounts — the demo board is a separate, clearly labelled
 * block in the UI (§35/§62).
 */
export type LeaderboardPeriod = "all-time" | "weekly" | "monthly";

const VIEW: Record<LeaderboardPeriod, string> = {
  "all-time": "leaderboard_all_time",
  weekly: "leaderboard_weekly",
  monthly: "leaderboard_monthly",
};

/**
 * The board is the same for every visitor, so it is fetched without a session
 * and shared for a minute rather than recomputed per request.
 *
 * Measured before this: /leaderboard answered in 550-1050ms against ~330ms for
 * every other page, despite the view itself running in 76ms. The cost was
 * re-establishing the session and re-running the ranking on each request for a
 * result nobody needs to the second.
 *
 * `unstable_cache` rather than `use cache`: the newer directive needs
 * `cacheComponents` enabled for the whole app, which changes how every route
 * renders. That is worth doing deliberately, not as a side effect of speeding
 * up one page.
 */
const cachedBoard = unstable_cache(
  async (period: LeaderboardPeriod, limit: number) => fetchBoard(period, limit),
  ["leaderboard"],
  { revalidate: 60, tags: ["leaderboard"] }
);

export async function getLeaderboard(
  period: LeaderboardPeriod = "all-time",
  limit = 25
): Promise<LeaderboardRow[]> {
  return cachedBoard(period, limit);
}

async function fetchBoard(
  period: LeaderboardPeriod,
  limit: number
): Promise<LeaderboardRow[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(VIEW[period])
    .select("id, username, display_name, avatar_url, total_xp, current_streak, rank")
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row) => ({
    id: String(row.id),
    displayName:
      (row.display_name as string | null) ?? (row.username as string | null) ?? "Anonymous",
    avatarUrl: (row.avatar_url as string | null) ?? null,
    totalXp: Number(row.total_xp ?? 0),
    currentStreak: Number(row.current_streak ?? 0),
    rank: Number(row.rank ?? 0),
  }));
}

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

// ---------------------------------------------------------------------------
// better-auth tables
// ---------------------------------------------------------------------------
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

// ---------------------------------------------------------------------------
// Personal API tokens (used by the pk-deck skill and other agents)
// ---------------------------------------------------------------------------
export const apiToken = sqliteTable(
  "api_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hash: text("hash").notNull().unique(),
    prefix: text("prefix").notNull(),
    suffix: text("suffix").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("api_token_user_idx").on(t.userId)]
);

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------
export const deck = sqliteTable(
  "deck",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").default(""),
    source: text("source", { enum: ["upload", "ai"] }).notNull(),
    topic: text("topic"),
    spiceLevel: text("spice_level", {
      enum: ["mild", "medium", "spicy"],
    })
      .notNull()
      .default("mild"),
    status: text("status", {
      enum: ["processing", "ready", "failed"],
    })
      .notNull()
      .default("processing"),
    errorMessage: text("error_message"),
    slideCount: integer("slide_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [
    index("deck_owner_idx").on(t.ownerId),
    index("deck_status_idx").on(t.status),
  ]
);

export const deckTag = sqliteTable(
  "deck_tag",
  {
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deckId, t.tag] })]
);

export const slide = sqliteTable(
  "slide",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    kind: text("kind", { enum: ["image", "html"] }).notNull(),
    src: text("src").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [
    index("slide_deck_idx").on(t.deckId, t.index),
    unique("slide_deck_index_unique").on(t.deckId, t.index),
  ]
);

// ---------------------------------------------------------------------------
// Rooms + sessions
// ---------------------------------------------------------------------------
export const room = sqliteTable(
  "room",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    hostUserId: text("host_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    state: text("state", {
      enum: ["lobby", "deck-vote", "round", "leaderboard", "ended"],
    })
      .notNull()
      .default("lobby"),
    currentRoundId: text("current_round_id"),
    currentDeckVoteId: text("current_deck_vote_id"),
    config: text("config", { mode: "json" })
      .$type<{
        maxRoundSeconds: number;
        rubric: string[];
      }>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("room_code_idx").on(t.code)]
);

export const participant = sqliteTable(
  "participant",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["host", "player"] })
      .notNull()
      .default("player"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [index("participant_room_idx").on(t.roomId)]
);

// Group-vote on which deck the presenter gets. Created when the host opens
// the vote phase; rows in deck_vote_ballot are 1 per (vote, voter).
export const deckVote = sqliteTable(
  "deck_vote",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    presenterParticipantId: text("presenter_participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    candidateDeckIds: text("candidate_deck_ids", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    winnerDeckId: text("winner_deck_id").references(() => deck.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("deck_vote_room_idx").on(t.roomId)]
);

export const deckVoteBallot = sqliteTable(
  "deck_vote_ballot",
  {
    voteId: text("vote_id")
      .notNull()
      .references(() => deckVote.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [primaryKey({ columns: [t.voteId, t.participantId] })]
);

export const round = sqliteTable(
  "round",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    presenterParticipantId: text("presenter_participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").notNull(),
    state: text("state", {
      enum: ["presenting", "rating", "done"],
    })
      .notNull()
      .default("presenting"),
    currentSlideIndex: integer("current_slide_index").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [index("round_room_idx").on(t.roomId, t.orderIndex)]
);

export const roundSlide = sqliteTable(
  "round_slide",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => round.id, { onDelete: "cascade" }),
    slideId: text("slide_id")
      .notNull()
      .references(() => slide.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").notNull(),
    skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("round_slide_round_idx").on(t.roundId, t.orderIndex)]
);

export const slideSkipVote = sqliteTable(
  "slide_skip_vote",
  {
    roundSlideId: text("round_slide_id")
      .notNull()
      .references(() => roundSlide.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [
    primaryKey({ columns: [t.roundSlideId, t.participantId] }),
    index("slide_skip_vote_rs_idx").on(t.roundSlideId),
  ]
);

export const rating = sqliteTable(
  "rating",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => round.id, { onDelete: "cascade" }),
    judgeParticipantId: text("judge_participant_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    criterion: text("criterion").notNull(),
    score: integer("score").notNull(),
    comment: text("comment"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [
    index("rating_round_idx").on(t.roundId),
    unique("rating_round_judge_criterion_unique").on(
      t.roundId,
      t.judgeParticipantId,
      t.criterion
    ),
  ]
);

export type User = typeof user.$inferSelect;
export type Deck = typeof deck.$inferSelect;
export type Slide = typeof slide.$inferSelect;
export type Room = typeof room.$inferSelect;
export type Participant = typeof participant.$inferSelect;
export type Round = typeof round.$inferSelect;
export type RoundSlide = typeof roundSlide.$inferSelect;
export type Rating = typeof rating.$inferSelect;
export type RoomConfig = NonNullable<Room["config"]>;

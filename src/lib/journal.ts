import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { isCategory } from "./categories";
import { hideDemo } from "./demo";
import { db, schema } from "./db";

const { posts, postComments, postAppreciations, follows, users, flags } = schema;

// Only published posts are public. "in_review" and "removed" are author/admin only.

// Written with explicit table names: in a query without joins drizzle drops
// the table prefix, and an unqualified "id" would bind to the inner table.
const appreciationCount = sql<number>`(select count(*)::int from post_appreciations pa where pa.post_id = "posts"."id")`;
const commentCount = sql<number>`(select count(*)::int from post_comments pc where pc.post_id = "posts"."id" and pc.status = 'visible')`;
const viewCount = sql<number>`(select count(*)::int from post_views pv where pv.post_id = "posts"."id")`;

const cardFields = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  category: posts.category,
  excerpt: sql<string>`coalesce(nullif(${posts.subtitle}, ''), left(${posts.body}, 280))`,
  coverFile: posts.coverFile,
  coverTheme: posts.coverTheme,
  coverPattern: posts.coverPattern,
  videoUrl: posts.videoUrl,
  aiPercent: posts.aiPercent,
  tier: posts.tier,
  processVerified: posts.processVerified,
  isDemo: posts.isDemo,
  featuredAt: posts.featuredAt,
  createdAt: posts.createdAt,
  words: sql<number>`coalesce(array_length(regexp_split_to_array(nullif(trim(${posts.body}), ''), '\\s+'), 1), 0)`,
  authorName: users.name,
  authorHandle: users.handle,
  authorAvatarFile: users.avatarFile,
  authorFounding: users.founding,
  appreciations: appreciationCount,
  comments: commentCount,
};

export interface PostFilters {
  q?: string;
  category?: string;
  categories?: string[];
  maxAi?: number;
  verified?: boolean;
  hasVideo?: boolean;
  sort?: "new" | "least-ai";
  /** Only posts by people this user follows. */
  followedBy?: number;
  /** Only posts a moderator has featured, newest feature first. */
  featured?: boolean;
  authorId?: number;
  limit?: number;
}

export async function searchPosts(filters: PostFilters) {
  const where = [eq(posts.status, "published")];
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(posts.title, term), ilike(posts.subtitle, term), ilike(posts.body, term), ilike(users.name, term))!);
  }
  if (filters.category && isCategory(filters.category)) where.push(eq(posts.category, filters.category));
  const categories = filters.categories?.filter(isCategory) ?? [];
  if (categories.length) where.push(inArray(posts.category, categories));
  if (filters.maxAi !== undefined) where.push(lte(posts.aiPercent, filters.maxAi));
  if (filters.verified) where.push(eq(posts.processVerified, true));
  if (filters.hasVideo) where.push(isNotNull(posts.videoUrl));
  if (filters.authorId !== undefined) where.push(eq(posts.authorId, filters.authorId));
  if (hideDemo()) where.push(eq(posts.isDemo, false));
  if (filters.followedBy !== undefined) {
    where.push(
      inArray(
        posts.authorId,
        db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, filters.followedBy)),
      ),
    );
  }
  if (filters.featured) where.push(isNotNull(posts.featuredAt));

  return db
    .select(cardFields)
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(...where))
    .orderBy(...(filters.featured ? [desc(posts.featuredAt)] : filters.sort === "least-ai" ? [asc(posts.aiPercent), desc(posts.createdAt)] : [desc(posts.createdAt)]))
    .limit(filters.limit ?? 60);
}

export type PostCard = Awaited<ReturnType<typeof searchPosts>>[number];

export async function getPost(slug: string) {
  const [row] = await db
    .select({ post: posts, author: { id: users.id, name: users.name, handle: users.handle, bio: users.bio } })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(hideDemo() ? and(eq(posts.slug, slug), eq(posts.isDemo, false)) : eq(posts.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getPostActivity(postId: number, viewerId: number | null) {
  const [[appreciations], mine, comments] = await Promise.all([
    db.select({ n: count() }).from(postAppreciations).where(eq(postAppreciations.postId, postId)),
    viewerId === null
      ? Promise.resolve([])
      : db
          .select({ postId: postAppreciations.postId })
          .from(postAppreciations)
          .where(and(eq(postAppreciations.postId, postId), eq(postAppreciations.userId, viewerId)))
          .limit(1),
    db
      .select({
        id: postComments.id,
        body: postComments.body,
        createdAt: postComments.createdAt,
        authorId: postComments.authorId,
        authorName: users.name,
        authorHandle: users.handle,
        authorAvatarFile: users.avatarFile,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.authorId, users.id))
      .where(and(eq(postComments.postId, postId), eq(postComments.status, "visible")))
      .orderBy(asc(postComments.createdAt)),
  ]);
  return { appreciations: appreciations?.n ?? 0, appreciated: mine.length > 0, comments };
}

export async function isFollowing(followerId: number, followingId: number) {
  const [row] = await db
    .select({ id: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return Boolean(row);
}

export async function followCounts(userId: number) {
  const [[followers], [following]] = await Promise.all([
    db.select({ n: count() }).from(follows).where(eq(follows.followingId, userId)),
    db.select({ n: count() }).from(follows).where(eq(follows.followerId, userId)),
  ]);
  return { followers: followers?.n ?? 0, following: following?.n ?? 0 };
}

export async function getMyPosts(userId: number) {
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      category: posts.category,
      coverFile: posts.coverFile,
      coverTheme: posts.coverTheme,
      coverPattern: posts.coverPattern,
      videoUrl: posts.videoUrl,
      status: posts.status,
      aiPercent: posts.aiPercent,
      tier: posts.tier,
      createdAt: posts.createdAt,
      appreciations: appreciationCount,
      comments: commentCount,
      views: viewCount,
    })
    .from(posts)
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.createdAt));
}

/**
 * Totals across everything a creator has shared: views (with a count per day
 * for the last 7 days), and how many views, appreciations and comments from
 * other people arrived in the last 7 days.
 */
export async function getCreatorStats(userId: number) {
  // Views are stamped with the UTC date (see views.ts), so days are counted in UTC here too.
  const today = sql`(now() at time zone 'utc')::date`;
  const [[week], days] = await Promise.all([
    db.execute<{ views: number; appreciations: number; comments: number }>(sql`
      select
        (select count(*)::int from post_views v join posts p on p.id = v.post_id
          where p.author_id = ${userId} and v.day > ${today} - 7) as views,
        (select count(*)::int from post_appreciations a join posts p on p.id = a.post_id
          where p.author_id = ${userId} and a.user_id <> ${userId} and a.created_at > now() - interval '7 days') as appreciations,
        (select count(*)::int from post_comments c join posts p on p.id = c.post_id
          where p.author_id = ${userId} and c.author_id <> ${userId} and c.status = 'visible'
            and c.created_at > now() - interval '7 days') as comments`),
    db.execute<{ day: string; views: number }>(sql`
      select to_char(d.day, 'YYYY-MM-DD') as day, count(v.post_id)::int as views
      from generate_series(${today} - 6, ${today}, interval '1 day') as d(day)
      left join post_views v on v.day = d.day::date
        and v.post_id in (select id from posts where author_id = ${userId})
      group by d.day order by d.day`),
  ]);
  return {
    thisWeek: { views: week?.views ?? 0, appreciations: week?.appreciations ?? 0, comments: week?.comments ?? 0 },
    lastSevenDays: days.map((d) => ({ day: d.day, views: Number(d.views) })),
  };
}

/** The latest comments and appreciations other people left on a creator's posts. */
export async function getRecentActivity(userId: number, limit = 6) {
  const rows = await db.execute<{
    kind: "comment" | "appreciation";
    at: string;
    body: string | null;
    slug: string;
    title: string;
    name: string;
    handle: string;
    avatarFile: string | null;
  }>(sql`
    select * from (
      select 'comment' as kind, c.created_at as at, c.body, p.slug, p.title,
        u.name, u.handle, u.avatar_file as "avatarFile"
      from post_comments c join posts p on p.id = c.post_id join users u on u.id = c.author_id
      where p.author_id = ${userId} and c.author_id <> ${userId} and c.status = 'visible'
      union all
      select 'appreciation', a.created_at, null, p.slug, p.title, u.name, u.handle, u.avatar_file
      from post_appreciations a join posts p on p.id = a.post_id join users u on u.id = a.user_id
      where p.author_id = ${userId} and a.user_id <> ${userId}
    ) activity
    order by at desc
    limit ${limit}`);
  return rows.map((r) => ({ ...r, at: new Date(r.at) }));
}

export async function getPostReviewQueue() {
  const pending = await db
    .select({ post: posts, authorName: users.name, authorHandle: users.handle })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.status, "in_review"))
    .orderBy(asc(posts.createdAt));

  const postFlags = await db
    .select({
      id: flags.id,
      reason: flags.reason,
      details: flags.details,
      createdAt: flags.createdAt,
      postSlug: posts.slug,
      postTitle: posts.title,
      aiPercent: posts.aiPercent,
      reporter: users.handle,
    })
    .from(flags)
    .innerJoin(posts, eq(flags.postId, posts.id))
    .innerJoin(users, eq(flags.reporterId, users.id))
    .where(eq(flags.status, "open"))
    .orderBy(asc(flags.createdAt));

  const commentFlags = await db
    .select({
      id: flags.id,
      reason: flags.reason,
      details: flags.details,
      createdAt: flags.createdAt,
      commentBody: postComments.body,
      commentStatus: postComments.status,
      postSlug: posts.slug,
      postTitle: posts.title,
      reporter: users.handle,
    })
    .from(flags)
    .innerJoin(postComments, eq(flags.commentId, postComments.id))
    .innerJoin(posts, eq(postComments.postId, posts.id))
    .innerJoin(users, eq(flags.reporterId, users.id))
    .where(eq(flags.status, "open"))
    .orderBy(asc(flags.createdAt));

  return { pending, postFlags, commentFlags };
}

import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { isCategory } from "./categories";
import { db, schema } from "./db";

const { posts, postComments, postAppreciations, follows, users, flags } = schema;

// Only published posts are public. "in_review" and "removed" are author/admin only.

// Written with explicit table names: in a query without joins drizzle drops
// the table prefix, and an unqualified "id" would bind to the inner table.
const appreciationCount = sql<number>`(select count(*)::int from post_appreciations pa where pa.post_id = "posts"."id")`;
const commentCount = sql<number>`(select count(*)::int from post_comments pc where pc.post_id = "posts"."id" and pc.status = 'visible')`;

const cardFields = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  category: posts.category,
  excerpt: sql<string>`left(${posts.body}, 280)`,
  coverFile: posts.coverFile,
  aiPercent: posts.aiPercent,
  tier: posts.tier,
  processVerified: posts.processVerified,
  isDemo: posts.isDemo,
  createdAt: posts.createdAt,
  authorName: users.name,
  authorHandle: users.handle,
  appreciations: appreciationCount,
  comments: commentCount,
};

export interface PostFilters {
  q?: string;
  category?: string;
  /** Only posts by people this user follows. */
  followedBy?: number;
  authorId?: number;
  limit?: number;
}

export async function searchPosts(filters: PostFilters) {
  const where = [eq(posts.status, "published")];
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(posts.title, term), ilike(posts.body, term), ilike(users.name, term))!);
  }
  if (filters.category && isCategory(filters.category)) where.push(eq(posts.category, filters.category));
  if (filters.authorId !== undefined) where.push(eq(posts.authorId, filters.authorId));
  if (filters.followedBy !== undefined) {
    where.push(
      inArray(
        posts.authorId,
        db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, filters.followedBy)),
      ),
    );
  }

  return db
    .select(cardFields)
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(...where))
    .orderBy(desc(posts.createdAt))
    .limit(filters.limit ?? 60);
}

export type PostCard = Awaited<ReturnType<typeof searchPosts>>[number];

export async function getPost(slug: string) {
  const [row] = await db
    .select({ post: posts, author: { id: users.id, name: users.name, handle: users.handle, bio: users.bio } })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.slug, slug))
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
      status: posts.status,
      aiPercent: posts.aiPercent,
      tier: posts.tier,
      createdAt: posts.createdAt,
      appreciations: appreciationCount,
      comments: commentCount,
    })
    .from(posts)
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.createdAt));
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

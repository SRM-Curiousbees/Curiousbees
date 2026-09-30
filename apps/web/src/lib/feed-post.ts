/**
 * Shapes an API thread into what the feed's post card renders. Shared by the
 * feed and the single-post page so a post looks and behaves the same in both.
 */
export function toFeedPost(t: any) {
  return {
    id: t.id,
    title: t.title,
    content: t.content,
    createdAt: t.createdAt,
    author: t.author
      ? {
          id: t.author.id,
          name: t.author.name,
          image: t.author.image,
          role: t.author.role,
          department: t.author.department,
          faculty: t.author.faculty,
        }
      : undefined,
    authorId: t.authorId ?? t.author?.id,
    tags: t.tags || [],
    // _count covers replies too; the embedded list may be a preview (the feed sends the latest 3).
    commentsCount: t._count?.comments ?? t.comments?.length ?? 0,
    likesCount: t._count?.likes || 0,
    collaboratorsCount: t._count?.shares || 0,
    badge: t.type ? String(t.type).replace('_', ' ') : undefined,
    rawType: t.type,
    isPaper: t.isPaper,
    // Only show a journal when the author gave one.
    paperInfo: t.isPaper ? { journal: t.paperJournal || undefined } : undefined,
    interestedCount: 0,
    attachments: t.attachments,
    saves: t.saves,
    likes: t.likes,
    comments: t.comments,
    _count: t._count,
  };
}

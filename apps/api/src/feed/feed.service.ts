import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async searchFeed(query: string) {
    if (!query || query.trim() === '') {
      return { threads: [], publications: [], users: [] };
    }

    const term = query.trim();
    
    const threads = await this.prisma.thread.findMany({
      where: {
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { content: { contains: term, mode: 'insensitive' } },
          { tags: { has: term } }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            department: true,
            faculty: true,
            departmentId: true,
            departmentRef: {
              select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } }
            }
          }
        },
        _count: { select: { comments: true, likes: true, shares: true, saves: true } }
      },
      take: 10
    });

    const publications = await this.prisma.publication.findMany({
      where: {
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { authors: { contains: term, mode: 'insensitive' } }
        ]
      },
      take: 10
    });

    const users = await this.prisma.user.findMany({
      where: {
        NOT: { name: { contains: 'admin', mode: 'insensitive' } },
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { department: { contains: term, mode: 'insensitive' } },
          { bio: { contains: term, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        department: true,
        faculty: true,
        departmentId: true,
        departmentRef: {
          select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } }
        }
      },
      take: 10
    });

    return { threads, publications, users };
  }

  async getSuggestedPeers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: { include: { interest: true } },
        following: { select: { followingId: true } },
        followedDomains: { select: { domain: true } }
      }
    });

    if (!user) return [];

    const userInterests = user.interests.map(i => i.interest.name);
    const followedUserIds = user.following.map(f => f.followingId);
    const followedDomains = user.followedDomains.map(d => d.domain);

    // Fetch potential peer recommendations (excluding self and already followed)
    const peers = await this.prisma.user.findMany({
      where: {
        id: { notIn: [userId, ...followedUserIds] },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        department: true,
        faculty: true,
        departmentId: true,
        departmentRef: {
          select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } }
        },
        interests: { include: { interest: true } },
        followers: { where: { followerId: userId }, select: { id: true } }
      },
      take: 10
    });

    // Format & calculate recommendation reasons
    return peers.map(peer => {
      const peerDomains = peer.interests.map(i => i.interest.name);
      const sharedInterests = peerDomains.filter(i => userInterests.includes(i));
      const matchingFollowedDomain = peerDomains.find(d => followedDomains.includes(d));

      let reason = 'Active SRMIST Researcher';
      if (matchingFollowedDomain) {
        reason = `Because you follow ${matchingFollowedDomain}`;
      } else if (sharedInterests.length > 0) {
        reason = `${sharedInterests.length} shared research ${sharedInterests.length === 1 ? 'interest' : 'interests'}`;
      } else if ((peer.departmentId && user.departmentId && peer.departmentId === user.departmentId) || (peer.department && peer.department === user.department)) {
        reason = `Same department (${(peer.departmentRef?.name || peer.department || '').split('(')[0].trim()})`;
      }

      const formattedRole = peer.role === 'RESEARCH_SUPERVISOR' || (peer.role as any) === 'SUPERVISOR'
        ? 'Research Supervisor'
        : 'Research Scholar';

      return {
        id: peer.id,
        name: peer.name || 'Scholar',
        image: peer.image,
        role: formattedRole,
        department: peer.departmentRef?.name || (peer.department ? peer.department.split('(')[0].trim() : 'SRMIST'),
        domains: peerDomains.slice(0, 3),
        reason,
        isFollowing: peer.followers.length > 0
      };
    }).slice(0, 5);
  }

  async getTrendingResearch() {
    // 1. Fetch tags & activity metrics from database threads
    const threads = await this.prisma.thread.findMany({
      select: { tags: true, _count: { select: { comments: true, likes: true, shares: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // 2. Fetch active institutional research interests and scholar/supervisor counts
    const interests = await this.prisma.researchInterest.findMany({
      include: {
        _count: { select: { users: true } }
      }
    });

    const tagCounts: Record<string, { display: string; count: number }> = {};

    // Add weights from DB posts
    for (const thread of threads) {
      const weight = 1 + thread._count.likes + (thread._count.comments * 2) + (thread._count.shares * 3);
      for (const tag of thread.tags) {
        if (tag && tag.trim()) {
          const key = tag.trim().toLowerCase();
          if (!tagCounts[key]) {
            tagCounts[key] = { display: tag.trim(), count: 0 };
          }
          tagCounts[key].count += weight;
        }
      }
    }

    // Add weights from DB scholar & supervisor interest counts
    for (const interest of interests) {
      if (interest.name) {
        const key = interest.name.trim().toLowerCase();
        const userWeight = Math.max(1, interest._count.users) * 3;
        if (!tagCounts[key]) {
          tagCounts[key] = { display: interest.name.trim(), count: 0 };
        }
        tagCounts[key].count += userWeight;
      }
    }

    // Dynamic fallbacks if DB is completely fresh
    if (Object.keys(tagCounts).length === 0) {
      const defaults = [
        { key: 'artificial intelligence', display: 'Artificial Intelligence', count: 18 },
        { key: 'deep learning', display: 'Deep Learning', count: 14 },
        { key: 'knowledge graphs', display: 'Knowledge Graphs', count: 11 },
        { key: 'quantum computing', display: 'Quantum Computing', count: 8 },
        { key: 'bioinformatics', display: 'Bioinformatics', count: 6 },
      ];
      for (const item of defaults) {
        tagCounts[item.key] = { display: item.display, count: item.count };
      }
    }

    const sortedTags = Object.values(tagCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(item => ({
        tag: item.display,
        count: Math.floor(item.count)
      }));

    return sortedTags;
  }
}

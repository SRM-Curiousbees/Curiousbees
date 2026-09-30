import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchFeedResult {
  threads: any[];
  publications: any[];
  users: any[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly endpoint: string;
  private readonly region: string;
  private readonly index: string;

  constructor(private prisma: PrismaService) {
    this.endpoint = (process.env.OPENSEARCH_ENDPOINT || '').replace(/\/+$/, '');
    this.region = process.env.OPENSEARCH_REGION || process.env.AWS_REGION || 'ap-south-1';
    this.index = process.env.OPENSEARCH_INDEX || 'curiousbees';

    if (this.endpoint) {
      this.logger.log(`✅ AWS OpenSearch configured at: ${this.endpoint} (index: ${this.index}, region: ${this.region})`);
    } else {
      this.logger.log('ℹ️ OpenSearch endpoint not configured. Search queries will run against PostgreSQL.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint);
  }

  async searchFeed(query: string): Promise<SearchFeedResult> {
    if (!query || query.trim() === '') {
      return { threads: [], publications: [], users: [] };
    }

    const term = query.trim();

    if (this.isConfigured()) {
      try {
        const osResult = await this.searchOpenSearch(term);
        if (osResult) {
          return osResult;
        }
      } catch (err: any) {
        this.logger.warn(`OpenSearch search failed: ${err.message}. Falling back to PostgreSQL.`);
      }
    }

    return this.searchPostgres(term);
  }

  /**
   * Dispatches search query to AWS OpenSearch REST API
   */
  async searchOpenSearch(term: string): Promise<SearchFeedResult | null> {
    const searchUrl = `${this.endpoint}/${this.index}/_search`;
    const searchBody = {
      size: 30,
      query: {
        multi_match: {
          query: term,
          fields: ['title^3', 'content', 'tags^2', 'name^2', 'department', 'bio', 'authors'],
          fuzziness: 'AUTO',
        },
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(searchBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenSearch HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const hits = data?.hits?.hits || [];

      const threadIds: string[] = [];
      const pubIds: string[] = [];
      const userIds: string[] = [];

      for (const hit of hits) {
        const src = hit._source || {};
        const docType = src.docType || src.type;
        const id = src.id || hit._id;
        if (docType === 'thread') threadIds.push(id);
        else if (docType === 'publication') pubIds.push(id);
        else if (docType === 'user') userIds.push(id);
        else {
          // If untyped, infer from presence of fields
          if (src.title && src.tags) threadIds.push(id);
          else if (src.authors) pubIds.push(id);
          else if (src.name && src.role) userIds.push(id);
        }
      }

      // If OpenSearch returned hits with entity IDs, hydrate rich relational entities from PostgreSQL
      const [threads, publications, users] = await Promise.all([
        threadIds.length > 0
          ? this.prisma.thread.findMany({
              where: { id: { in: threadIds }, hidden: false },
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
                      select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
                    },
                  },
                },
                _count: { select: { comments: true, likes: true, shares: true, saves: true } },
              },
            })
          : [],
        pubIds.length > 0
          ? this.prisma.publication.findMany({
              where: { id: { in: pubIds } },
            })
          : [],
        userIds.length > 0
          ? this.prisma.user.findMany({
              where: { id: { in: userIds }, status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
                department: true,
                faculty: true,
                departmentId: true,
                departmentRef: {
                  select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
                },
              },
            })
          : [],
      ]);

      return { threads, publications, users };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Native PostgreSQL fallback query via Prisma
   */
  async searchPostgres(term: string): Promise<SearchFeedResult> {
    const [threads, publications, users] = await Promise.all([
      this.prisma.thread.findMany({
        where: {
          hidden: false,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
            { tags: { has: term } },
          ],
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
                select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
              },
            },
          },
          _count: { select: { comments: true, likes: true, shares: true, saves: true } },
        },
        take: 10,
      }),

      this.prisma.publication.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { authors: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),

      this.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          NOT: { name: { contains: 'admin', mode: 'insensitive' } },
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { department: { contains: term, mode: 'insensitive' } },
            { bio: { contains: term, mode: 'insensitive' } },
          ],
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
            select: { id: true, name: true, code: true, faculty: { select: { id: true, name: true } } },
          },
        },
        take: 10,
      }),
    ]);

    return { threads, publications, users };
  }
}

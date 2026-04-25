import { graphql } from '@octokit/graphql';
import type { RepoContext } from './manifest.js';

// One-shot GraphQL query: list the user's non-archived public repos with the
// metadata we need + the raw .portfolio.yml text if present. Using the `HEAD`
// expression pins to each repo's default branch without a separate lookup.
//
// The GraphQL API caps page size at 100; pagination walks cursors until exhausted.
const REPOS_QUERY = /* GraphQL */ `
  query Repos($login: String!, $cursor: String) {
    user(login: $login) {
      repositories(
        first: 100
        after: $cursor
        isArchived: false
        privacy: PUBLIC
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        nodes {
          name
          description
          url
          stargazerCount
          pushedAt
          defaultBranchRef {
            name
          }
          primaryLanguage {
            name
          }
          portfolioYml: object(expression: "HEAD:.portfolio.yml") {
            ... on Blob {
              text
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

interface GqlRepoNode {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  pushedAt: string;
  defaultBranchRef: { name: string } | null;
  primaryLanguage: { name: string } | null;
  portfolioYml: { text: string } | null;
}

interface GqlResponse {
  user: {
    repositories: {
      nodes: GqlRepoNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
}

export interface FetchedRepo {
  context: RepoContext;
  portfolioYmlText: string | null;
}

export async function fetchReposWithPortfolioYml(
  token: string,
  login: string,
): Promise<FetchedRepo[]> {
  const client = graphql.defaults({
    headers: { authorization: `token ${token}` },
  });

  const results: FetchedRepo[] = [];
  let cursor: string | null = null;

  // Loop pagination cursors; most users have well under 100 public non-archived
  // repos, so this typically runs once.
  do {
    const response: GqlResponse = await client<GqlResponse>(REPOS_QUERY, {
      login,
      cursor,
    });
    if (!response.user) throw new Error(`GitHub user not found: ${login}`);

    for (const node of response.user.repositories.nodes) {
      // Skip repos without a default branch (empty/uninitialized).
      if (!node.defaultBranchRef) continue;

      results.push({
        context: {
          owner: login,
          name: node.name,
          url: node.url,
          default_branch: node.defaultBranchRef.name,
          description: node.description,
          primary_language: node.primaryLanguage?.name ?? null,
          stars: node.stargazerCount,
          pushed_at: node.pushedAt,
        },
        portfolioYmlText: node.portfolioYml?.text ?? null,
      });
    }

    cursor = response.user.repositories.pageInfo.hasNextPage
      ? response.user.repositories.pageInfo.endCursor
      : null;
  } while (cursor);

  return results;
}

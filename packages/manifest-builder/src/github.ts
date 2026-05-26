import { graphql } from '@octokit/graphql';
import type { RepoContext } from './manifest.js';

// One-shot GraphQL query: list the user's non-archived repos (public + private)
// with the metadata we need + the raw .portfolio.yml text if present. Using the
// `HEAD` expression pins to each repo's default branch without a separate lookup.
//
// Private repos require the token to carry the `repo` scope (public_repo alone
// returns only public repos). Inclusion is still gated by the presence of a
// valid .portfolio.yml downstream — the query just no longer pre-filters by
// visibility.
//
// The GraphQL API caps page size at 100; pagination walks cursors until exhausted.
const REPOS_QUERY = /* GraphQL */ `
  query Repos($login: String!, $cursor: String) {
    user(login: $login) {
      repositories(
        first: 100
        after: $cursor
        isArchived: false
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        nodes {
          name
          description
          url
          isPrivate
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
  isPrivate: boolean;
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

// Fetches the same RepoContext fields the bulk crawl returns, but for a
// single arbitrary repo (typically one the user contributed to but doesn't
// own). Returns null on any failure — 404, rate limit, auth issue — so the
// caller can fall back to YAML-supplied values and emit a warning rather
// than aborting the whole manifest build.
const SINGLE_REPO_QUERY = /* GraphQL */ `
  query Repo($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      description
      url
      isPrivate
      stargazerCount
      pushedAt
      defaultBranchRef {
        name
      }
      primaryLanguage {
        name
      }
    }
  }
`;

interface GqlSingleRepoResponse {
  repository: Omit<GqlRepoNode, 'portfolioYml'> | null;
}

export async function fetchUpstreamMetadata(
  token: string,
  owner: string,
  name: string,
): Promise<RepoContext | null> {
  const client = graphql.defaults({
    headers: { authorization: `token ${token}` },
  });

  try {
    const response = await client<GqlSingleRepoResponse>(SINGLE_REPO_QUERY, { owner, name });
    const repo = response.repository;
    if (!repo || !repo.defaultBranchRef) return null;

    return {
      owner,
      name: repo.name,
      private: repo.isPrivate,
      url: repo.url,
      default_branch: repo.defaultBranchRef.name,
      description: repo.description,
      primary_language: repo.primaryLanguage?.name ?? null,
      stars: repo.stargazerCount,
      pushed_at: repo.pushedAt,
    };
  } catch {
    return null;
  }
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
          private: node.isPrivate,
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

type GithubClientOptions = {
  token: string;
  userAgent?: string;
};

export class GithubClient {
  private token: string;
  private userAgent: string;

  constructor(opts: GithubClientOptions) {
    if (!opts?.token) throw new Error("GithubClient: token is required");
    this.token = opts.token;
    this.userAgent = opts.userAgent ?? "dev-integration-toolkit";
  }

  private async request<T>(path: string): Promise<T> {
    const url = `https://api.github.com${path}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": this.userAgent,
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!res.ok) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = res.headers.get("x-ratelimit-reset");
      let body = "";
      try {
        body = await res.text();
      } catch {}

      const hint =
        res.status === 401
          ? "Token invalid/expired or missing access."
          : res.status === 403 && remaining === "0"
          ? `Rate limited. Resets at unix=${reset}.`
          : res.status === 403
          ? "Forbidden. Check token permissions / org access."
          : "Request failed.";

      throw new Error(
        `GitHub API ${res.status} ${res.statusText}. ${hint}\n${body}`.trim()
      );
    }

    return (await res.json()) as T;
  }

  async listUserRepos(perPage = 100, page = 1) {
    const q = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
      sort: "updated",
      direction: "desc",
    });
    return this.request<any[]>(`/user/repos?${q.toString()}`);
  }

  async listAllUserRepos() {
    const all: any[] = [];
    let page = 1;

    while (true) {
      const batch = await this.listUserRepos(100, page);
      all.push(...batch);
      if (batch.length < 100) break;
      page += 1;
    }

    return all;
  }
}

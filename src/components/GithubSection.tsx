import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

type Repo = { id: number; name: string; description: string | null; language: string | null; stargazers_count: number; updated_at: string; created_at: string; html_url: string; fork: boolean };
type Profile = { public_repos: number; followers: number; following: number; created_at: string };
type ContributionDay = { date: string; contributionCount: number };
type Contributions = { totalContributions: number; weeks: { contributionDays: ContributionDay[] }[] };

function ContributionGrid({ calendar, from, to }: { calendar: Contributions; from: Date; to: Date }) {
  const intensity = (count: number) => count === 0 ? 0 : count < 3 ? 1 : count < 7 ? 2 : count < 14 ? 3 : 4;
  const monthLabel = (date: string) => new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${date}T00:00:00`));
  const rangeLabel = `${new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(from)} — ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(to)}`;
  let lastVisibleMonthIndex = -4;
  return <div className="contribution-grid" role="img" aria-label={`${calendar.totalContributions} GitHub contributions from ${rangeLabel}`}>
    <div className="contribution-grid__heading"><span className="mono">{rangeLabel.toUpperCase()}</span><strong>{calendar.totalContributions} CONTRIBUTIONS</strong></div>
    <div className="contribution-grid__body"><span className="contribution-grid__weekday">MON<br /><br /><br />WED<br /><br /><br />FRI</span><div className="contribution-grid__days">{calendar.weeks.map((week, index) => { const isLatestWeek = index === calendar.weeks.length - 1; const labelDate = isLatestWeek ? week.contributionDays.at(-1)?.date : week.contributionDays[0]?.date; const label = labelDate ? monthLabel(labelDate) : ""; const previousLabel = index > 0 ? monthLabel(calendar.weeks[index - 1].contributionDays[0]?.date) : ""; const showLabel = isLatestWeek || (index > 0 && label !== previousLabel && index - lastVisibleMonthIndex >= 4); if (showLabel) lastVisibleMonthIndex = index; return <div className="contribution-week" key={index}>{showLabel && <span className="contribution-month">{label}</span>}{week.contributionDays.map(day => <span key={day.date} className={`contribution-day contribution-day--${intensity(day.contributionCount)}`} data-tooltip={`${day.date} · ${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"}`} />)}</div>; })}</div></div>
    <div className="contribution-grid__legend"><span>LESS</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className={`contribution-day contribution-day--${level}`} />)}<span>MORE</span></div>
  </div>;
}

export function GithubSection({ username }: { username: string }) {
  const configured = username && !username.includes("[");
  const today = new Date();
  const currentYear = today.getFullYear();
  const [startYear, setStartYear] = useState(currentYear);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [calendar, setCalendar] = useState<Contributions | null>(null);
  const [error, setError] = useState(false);
  const [contributionError, setContributionError] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const abort = new AbortController();
    Promise.all([
      fetch(`https://api.github.com/users/${username}`, { signal: abort.signal }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { signal: abort.signal }),
    ]).then(async ([profileResponse, reposResponse]) => {
      if (!profileResponse.ok || !reposResponse.ok) throw new Error("GitHub unavailable");
      setProfile(await profileResponse.json());
      setRepos((await reposResponse.json()).filter((repo: Repo) => !repo.fork));
    }).catch(() => { if (!abort.signal.aborted) setError(true); });
    return () => abort.abort();
  }, [configured, username]);

  useEffect(() => {
    if (profile) setStartYear(year => Math.max(year, new Date(profile.created_at).getFullYear()));
  }, [profile]);

  useEffect(() => {
    if (!configured) return;
    const abort = new AbortController();
    const loadCalendar = () => fetch(`/api/github/contributions?year=${startYear}`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error("Contributions unavailable"); return response.json(); })
      .then(data => { setCalendar(data); setContributionError(false); })
      .catch(() => { if (!abort.signal.aborted) setContributionError(true); });
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void loadCalendar(); };
    void loadCalendar();
    const refreshInterval = window.setInterval(refreshWhenVisible, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { abort.abort(); window.clearInterval(refreshInterval); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [configured, startYear]);

  const startDate = new Date(startYear, 0, 1);
  const endDate = startYear === currentYear ? today : new Date(startYear, 11, 31);
  const availableStartYear = Math.min(profile ? new Date(profile.created_at).getFullYear() : currentYear - 5, currentYear);
  const years = Array.from({ length: currentYear - availableStartYear + 1 }, (_, index) => availableStartYear + index);
  const filteredRepos = repos.filter(repo => new Date(repo.created_at).getFullYear() === startYear);
  const stars = filteredRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  return <section id="github" className="github section-shell"><div className="section-label mono">OPEN SOURCE / GITHUB <span>CODE ACTIVITY / SELECT A YEAR</span></div><div className="github__intro"><h2>Building in<br /><em>the open.</em></h2><p>Public GitHub information loads from the GitHub API. Add your username in <code>src/data/portfolio.ts</code> to connect this section.</p></div>{!configured ? <div className="github__notice">GITHUB API WAITING FOR [GITHUB_USERNAME]</div> : error ? <div className="github__notice">GitHub is unavailable right now. The rest of the portfolio remains available.</div> : <><div className="github-range"><label htmlFor="github-start-year">SHOW ACTIVITY FOR</label><select id="github-start-year" value={startYear} onChange={event => setStartYear(Number(event.target.value))}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select><span>{startYear === currentYear ? "THROUGH TODAY" : "FULL YEAR"}</span></div><div className="github-stats">{[[profile?.public_repos, "PUBLIC REPOSITORIES"], [profile?.followers, "FOLLOWERS"], [profile ? stars : undefined, "STARS / SELECTED REPOS"]].map(([value, label]) => <div key={String(label)}><strong>{value ?? "—"}</strong><span>{label}</span></div>)}</div>{calendar ? <ContributionGrid calendar={calendar} from={startDate} to={endDate} /> : <div className="contribution-fallback"><span className="mono">CONTRIBUTION GRAPH</span><p>{contributionError ? "Contribution data is temporarily unavailable." : "LOADING CONTRIBUTION CALENDAR…"}</p></div>}<div className="repo-list">{filteredRepos.length ? filteredRepos.slice(0, 4).map(repo => <a key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer"><div><small>{repo.language || "CODE"}</small><h3>{repo.name}</h3><p>{repo.description || "No repository description."}</p></div><div className="repo-list__meta">★ {repo.stargazers_count} / {new Date(repo.updated_at).getFullYear()} <ArrowUpRight size={17} /></div></a>) : <div className="repo-skeleton">NO PUBLIC REPOSITORIES CREATED IN THIS YEAR.</div>}</div></>}</section>;
}

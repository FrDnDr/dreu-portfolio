export type Category = "data" | "ui" | "mobile" | "web";

export type Project = {
  index: string; title: string; slug: string; category: Category; year: string; description: string; image?: string;
  technologies: string[]; github?: string; liveUrl?: string; overview: string; problem: string; approach: string; solution: string;
};

export type Experience = {
  period: string; role: string; organization: string; description: string;
};

import resumeUrl from "../../documents/DREU-FRANCIS-DANIEL-RESUME.pdf?url";

export const portfolio = {
  name: "Francis Daniel Dreu", shortName: "FRANCIS DREU", location: "THE PHILIPPINES", availability: "REMOTE OPPORTUNITIES",
  email: "dreufrancisdaniel@gmail.com", phone: "[PHONE]", resume: resumeUrl, githubUsername: "FrDnDr",
  github: "https://github.com/FrDnDr", linkedin: "[LINKEDIN URL]", behance: "[BEHANCE URL]",
  headline: ["I BUILD THINGS", "THAT SOLVE", "PROBLEMS."],
  intro: "I’m Francis — a software developer and builder focused on creating data-driven products, automated systems, and thoughtful digital experiences.",
  bio: "I like working where software, data, and design overlap.",
  aboutDetail: "I enjoy taking messy problems, understanding how they work, and turning them into useful systems or products. My work ranges from web applications and dashboards to automation and data workflows — with iteration built into the process.",
  stats: [{ value: "[YEARS]", label: "YEARS EXPERIENCE" }, { value: "[00]", label: "PROJECTS COMPLETED" }, { value: "[00]", label: "TECHNOLOGIES" }, { value: "[00]", label: "GITHUB REPOSITORIES" }],
  roles: [
    { title: "DATA ANALYST", short: "ANALYZE", slug: "data", headline: ["TURNING RAW DATA", "INTO CLEAR DECISIONS."], description: "I explore, clean, analyze, and visualize data to uncover patterns, explain performance, and support better decisions.", skills: ["Python", "SQL", "Excel", "Power BI", "Tableau", "Pandas", "NumPy", "Data Cleaning"] },
    { title: "UI DESIGNER", short: "DESIGN", slug: "ui", headline: ["DESIGNING DIGITAL", "EXPERIENCES WITH INTENT."], description: "I translate problems and user needs into interfaces that are clear, intuitive, functional, and visually deliberate.", skills: ["Figma", "Wireframing", "Prototyping", "Design Systems", "Responsive Design", "User Flows"] },
    { title: "MOBILE DEVELOPER", short: "BUILD MOBILE", slug: "mobile", headline: ["BUILDING EXPERIENCES", "THAT LIVE IN YOUR POCKET."], description: "I build responsive, maintainable mobile applications that translate product ideas and interface designs into working experiences.", skills: ["Flutter", "Dart", "React Native", "Firebase", "REST APIs", "State Management"] },
    { title: "WEB DEVELOPER", short: "BUILD WEB", slug: "web", headline: ["BUILDING FOR", "THE MODERN WEB."], description: "I create responsive web experiences that combine maintainable engineering with thoughtful interface design.", skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"] },
  ],
  projects: ["data", "ui", "mobile", "web"].flatMap((category) => [1, 2, 3].map((number) => ({
    index: `${String(number).padStart(2, "0")}`, title: `[${category.toUpperCase()} PROJECT ${String(number).padStart(2, "0")}]`, slug: `${category}-project-${String(number).padStart(2, "0")}`,
    category: category as Category, year: "[YEAR]", description: "[PROJECT DESCRIPTION] — add a concise statement of the problem, the work, and the value created.", technologies: ["[TOOL 01]", "[TOOL 02]", "[TOOL 03]"], overview: "[PROJECT OVERVIEW]", problem: "[PROBLEM TO SOLVE]", approach: "[RESEARCH, PROCESS, OR METHODOLOGY]", solution: "[SOLUTION AND OUTCOME]", github: "", liveUrl: ""
  }))),
  skillGroups: { DATA: ["Python", "SQL", "Power BI", "Excel", "Pandas", "Tableau"], DESIGN: ["Figma", "Prototyping", "Design Systems", "Wireframing"], MOBILE: ["Flutter", "Dart", "Firebase", "React Native"], WEB: ["React", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "Node.js"], TOOLS: ["Git", "GitHub", "VS Code"] },
  experience: [
    {
      period: "JANUARY 2026 — JULY 2026",
      role: "Data Analyst Intern / Dashboard Developer",
      organization: "Mvolo · Remote",
      description: "Analyzed financial data and managed data-entry workflows to support reliable business reporting. Developed an API-based ETL pipeline that automated data retrieval and reduced manual data entry by 70%, then cleaned, transformed, and integrated multi-source data into PostgreSQL and the Mvolo Central Command Centre dashboard.",
    },
    {
      period: "MAY 2025 — JULY 2025",
      role: "Android Developer Intern",
      organization: "Nueca Technologies Inc. · Onsite",
      description: "Developed an Android application using Kotlin, REST API integration, and Room Database under senior developer mentorship. Built UI/UX, backend-integration, and local-persistence features while applying Git workflows, code reviews, and agile development practices in a collaborative team.",
    },
  ] satisfies Experience[],
};

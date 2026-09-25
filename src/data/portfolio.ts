export type Category = "data" | "ui" | "mobile" | "web";

export type ProjectPlatform = {
  name: string;
  type: "mobile" | "web" | "data" | "ui";
};

export type ProjectLinks = {
  github: string | null;
  live: string | null;
  figma: string | null;
  behance: string | null;
  mobile: string | null;
  admin: string | null;
};

export type Project = {
  index: string; title: string; slug: string; year: string; type: string; categories: string[];
  tagline: string; description: string; role: string[]; technologies: string[];
  platforms: ProjectPlatform[]; links: ProjectLinks; cover: string; gallery: string[];
  caseStudy: { overview: string; problem: string; goals: string[]; approach: string; solution: string; outcome: string };
  highlights: string[];
};

export type Experience = {
  period: string; role: string; organization: string; description: string;
};

export const portfolio = {
  version: "v1.18",
  name: "Francis Daniel Dreu", shortName: "FRANCIS DREU", location: "THE PHILIPPINES", availability: "REMOTE OPPORTUNITIES",
  email: "dreufrancisdaniel@gmail.com", phone: "09086993264", resume: "/DREU-FRANCIS-DANIEL-RESUME.pdf", githubUsername: "FrDnDr",
  github: "https://github.com/FrDnDr", linkedin: "https://www.linkedin.com/in/fddreu", behance: "[BEHANCE URL]",
  headline: ["I LEARN BY", "BUILDING AND", "CONTRIBUTING."],
  intro: "I’m Francis — a software developer who enjoys contributing to data-informed products, useful automation, and thoughtful digital experiences while learning from the people and problems behind them.",
  bio: "I like working where software, data, and design overlap.",
  aboutDetail: "I enjoy taking messy problems, understanding how they work, and turning them into useful systems or products. My work ranges from web applications and dashboards to automation and data workflows — with iteration built into the process.",
  stats: [{ value: "[01]", label: "YEARS EXPERIENCE" }, { value: "[26]", label: "TECHNOLOGIES" }],
  roles: [
    { title: "DATA ANALYST", short: "ANALYZE", slug: "data", headline: ["TURNING RAW DATA", "INTO CLEAR DECISIONS."], description: "I explore, clean, analyze, and visualize data to uncover patterns, explain performance, and support better decisions.", skills: ["Python", "SQL", "Excel", "Power BI", "Tableau", "Pandas", "NumPy", "Data Cleaning"] },
    { title: "UI DESIGNER", short: "DESIGN", slug: "ui", headline: ["DESIGNING DIGITAL", "EXPERIENCES WITH INTENT."], description: "I translate problems and user needs into interfaces that are clear, intuitive, functional, and visually deliberate.", skills: ["Figma", "Wireframing", "Prototyping", "Design Systems", "Responsive Design", "User Flows"] },
    { title: "MOBILE DEVELOPER", short: "BUILD MOBILE", slug: "mobile", headline: ["BUILDING EXPERIENCES", "THAT LIVE IN YOUR POCKET."], description: "I build responsive, maintainable mobile applications that translate product ideas and interface designs into working experiences.", skills: ["Flutter", "Dart", "React Native", "Firebase", "REST APIs", "State Management"] },
    { title: "WEB DEVELOPER", short: "BUILD WEB", slug: "web", headline: ["BUILDING FOR", "THE MODERN WEB."], description: "I create responsive web experiences that combine maintainable engineering with thoughtful interface design.", skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"] },
  ],
  projects: [
    {
      index: "01", title: "Mvolo — Shopify Financial ETL Pipeline", slug: "mvolo-shopify-etl", year: "2026", type: "DATA ENGINEERING / ANALYTICS", categories: ["DATA", "WEB"],
      tagline: "An API-based pipeline that turned manual Shopify financial reporting into dashboard-ready data.",
      description: "An internship project that extracted Shopify financial data, transformed it into profitability metrics, and loaded it into DuckDB for reporting in Mvolo Central Command Centre.",
      role: ["Data Analyst Intern", "Dashboard Developer"], technologies: ["Python", "Shopify API", "DuckDB", "JavaScript"],
      platforms: [{ name: "ETL pipeline", type: "data" }, { name: "Profitability dashboard", type: "web" }], links: { github: null, live: "https://project---mvolo.francisdreu.workers.dev/shopify", figma: null, behance: null, mobile: null, admin: null },
      cover: "", gallery: [],
      caseStudy: {
        overview: "An API-based ETL pipeline built during my Mvolo internship to replace recurring manual financial-data entry and provide a clearer view of Shopify profitability.",
        problem: "Financial reporting relied on repetitive manual entry, making the process slow and leaving limited time for analysis. The dashboard also needed a reliable way to use Shopify data for revenue, profit, and margin reporting.",
        goals: ["Reduce repetitive manual data entry", "Extract financial data directly from Shopify", "Create consistent profitability metrics", "Make transformed data available to the Central Command Centre dashboard"],
        approach: "Mapped the manual reporting flow, then built a pipeline that retrieved data through the Shopify API, prepared it for analysis in Python, and loaded the results into DuckDB for dashboard consumption.",
        solution: "Created a repeatable extract, transform, and load workflow for Shopify financial data. The resulting dataset supported revenue, profit, and margin reporting in the Mvolo Central Command Centre dashboard.",
        outcome: "Reduced manual data entry by 70% and gave the team a dashboard-ready data source for Shopify profitability reporting. This case study represents the internship implementation; the cover artwork will be added separately."
      }, highlights: ["Shopify API extraction", "Python data transformation", "DuckDB analytical storage", "Revenue, profit, and margin reporting", "70% reduction in manual entry"]
    },
    {
      index: "02", title: "NoBogey — Multi-Platform Golf Caddie Booking System", slug: "nobogey-caddie-booking", year: "2026", type: "MULTI-PLATFORM PRODUCT", categories: ["MOBILE", "WEB", "UI"],
      tagline: "A connected booking and operations experience for golfers, caddies, and course teams.",
      description: "A multi-platform golf caddie booking system with a public landing page, golfer and caddie mobile experiences, and an admin dashboard for course operations.",
      role: ["Frontend / Mobile Developer", "UI Implementation"], technologies: ["React Native", "Expo", "Expo Router", "TypeScript", "React", "Vite"],
      platforms: [{ name: "Golfer mobile app", type: "mobile" }, { name: "Caddie mobile app", type: "mobile" }, { name: "Admin dashboard", type: "web" }, { name: "Public landing page", type: "web" }], links: { github: null, live: "https://nobogeyofficial.com/", figma: null, behance: null, mobile: null, admin: null },
      cover: "/projects/nobogey-platform-ecosystem-cover.png", gallery: ["/projects/nobogey-landing-page.jpg", "/projects/nobogey-golfer-app.jpg", "/projects/nobogey-caddie-app.jpg", "/projects/nobogey-admin-dashboard.jpg"],
      caseStudy: {
        overview: "A connected product system for golfers, caddies, and course teams: a public landing page, role-specific mobile experiences, and an admin operations dashboard.",
        problem: "Booking a golf round with a caddie involves golfers, caddies, and course staff, so each group needs a clear view of the same workflow without losing role-specific context.",
        goals: ["Clarify the golfer booking sequence", "Support caddie and course-team workflows", "Keep assignment expectations transparent", "Maintain a consistent design system across platforms"],
        approach: "Mapped the service across four surfaces: a public landing page, a golfer flow from course to tee time to preferred caddie, a caddie dashboard, and an admin scheduler for course operations.",
        solution: "Built responsive mobile and web interfaces with shared visual language, guided onboarding around real controls, and a booking summary that describes a named caddie as a preference rather than a guarantee.",
        outcome: "Delivered a working frontend flow for review and testing. Current catalog and assignment data are fixture/mock-backed pending backend integration."
      }, highlights: ["Public product landing page", "Golfer booking flow", "Caddie dashboard", "Admin scheduling dashboard", "Role-aware responsive UI"]
    }
  ] satisfies Project[],
  skillGroups: { DATA: ["Python", "SQL", "Power BI", "Excel", "Pandas", "Tableau"], DESIGN: ["Figma", "Canva", "Prototyping", "Design Systems", "Wireframing"], MOBILE: ["Flutter", "Dart", "Firebase", "React Native", "Expo"], WEB: ["React", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS", "Node.js"], "AI TOOLS": ["Codex", "Claude Code", "Cursor", "Google Antigravity"], TOOLS: ["Git", "GitHub", "VS Code", "Supabase", "Google Sheets"] },
  experience: [
    {
      period: "JANUARY 2026 — JULY 2026",
      role: "Data Analyst Intern / Dashboard Developer",
      organization: "Mvolo · Remote",
      description: "Analyzed financial data and identified a recurring manual-work bottleneck. Initiated an API-based ETL pipeline during the internship, reducing manual data entry by 70%, and integrated its outputs into the Mvolo Central Command Centre dashboard. Built a Shopify profitability dashboard using Python, the Shopify API, DuckDB, and JavaScript to report revenue, profit, and margins. From May to July 2026, also served as Technical Lead Intern for LayerInsights, a project under Mvolo, overseeing development from the ground up. Integrated Shopify and Klaviyo OAuth data connectors and implemented a live Stripe payment workflow for platform billing.",
    },
    {
      period: "MAY 2025 — JULY 2025",
      role: "Android Developer Intern",
      organization: "Nueca Technologies Inc. · Onsite",
      description: "Developed an Android application using Kotlin, REST API integration, and Room Database under senior developer mentorship. Built UI/UX, backend-integration, and local-persistence features while applying Git workflows, code reviews, and agile development practices in a collaborative team.",
    },
  ] satisfies Experience[],
};

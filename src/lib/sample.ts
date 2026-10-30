// Example data so a new visitor can explore every screen before adding their own.
// All people and companies here are fictional.
import type { AppData, Job, Resume } from "./types";

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const resume: Resume = {
  id: "example-resume",
  name: "Example – Data Analyst",
  fileName: "jordan-lee-resume.pdf",
  createdAt: Date.now() - 20 * 86_400_000,
  updatedAt: Date.now() - 20 * 86_400_000,
  text: `JORDAN LEE
Denver, CO · jordan.lee@example.com

SUMMARY
Data analyst with two years of experience in logistics, turning shipping and inventory data into weekly decisions.

EXPERIENCE
Data Analyst, Front Range Freight — Denver, CO (2024–present)
- Made reports in SQL for stores.
- Built and maintain three Tableau dashboards used by 12 regional managers.
- Cleaned and merged carrier data from four systems into one inventory table.

Operations Intern, Peak Parcel — Boulder, CO (2023)
- Tracked late shipments in Excel and flagged recurring problem routes.

EDUCATION
B.S. Statistics, University of Wyoming, 2023

SKILLS
SQL, Tableau, Excel, basic R, data cleaning`,
};

const analysis: Job["analysis"] = {
  jobTitle: "Data Analyst",
  company: "Northwind Logistics",
  score: 72,
  breakdown: { skills: 70, experience: 78, education: 90, keywords: 58 },
  verdict: "Strong on SQL, dashboards and logistics data; the posting wants more Python and stakeholder presentation than the resume shows.",
  strengths: [
    { point: "SQL reporting", evidence: "Builds SQL reports for stores at Front Range Freight." },
    { point: "BI dashboards", evidence: "Three Tableau dashboards used by 12 regional managers." },
    { point: "Logistics domain", evidence: "Two years with shipping and inventory data." },
    { point: "Statistics degree", evidence: "B.S. Statistics, University of Wyoming." },
  ],
  gaps: [
    { point: "Python for analysis", suggestion: "If you've used pandas in coursework or a side project, add it with a concrete outcome." },
    { point: "Presenting findings to leadership", suggestion: "Describe a time you walked managers through a dashboard and what changed as a result." },
    { point: "A/B testing", suggestion: "Mention any experiment design from your statistics degree." },
  ],
  missingKeywords: ["Python", "A/B testing", "stakeholder management", "data modeling", "Looker", "forecasting"],
  bullets: [
    {
      original: "Made reports in SQL for stores.",
      improved: "Built recurring SQL reports on store-level shipping and inventory data that regional managers use for weekly planning.",
    },
    {
      original: "Cleaned and merged carrier data from four systems into one inventory table.",
      improved: "Unified carrier data from four source systems into a single inventory table, giving analysts one trusted source for shipment reporting.",
    },
  ],
  summary:
    "Data analyst with two years of logistics experience turning shipping and inventory data into weekly decisions. Builds SQL reporting and Tableau dashboards used by regional managers. Statistics graduate ready to bring an operations focus to Northwind's analytics team.",
  screening: [
    { question: "How many years of SQL experience do you have?", answer: "About two years of daily SQL, building reports on shipping and inventory data." },
    { question: "Which BI tools have you used?", answer: "Tableau, where I maintain three dashboards for regional managers, plus Excel." },
    { question: "Are you comfortable working on-site in Denver?", answer: "Yes, I'm based in Denver." },
  ],
  redFlags: [],
};

const jobs: Job[] = [
  {
    id: "example-1",
    title: "Data Analyst",
    company: "Northwind Logistics",
    url: "",
    location: "Denver, CO",
    description:
      "Northwind Logistics is hiring a Data Analyst to support our operations team. You will build SQL reporting, maintain dashboards, run A/B tests on routing changes and present findings to leadership. Requirements: 2+ years SQL, a BI tool (Looker preferred), Python for analysis, strong communication. Bachelor's in a quantitative field.",
    status: "Applied",
    createdAt: Date.now() - 10 * 86_400_000,
    appliedOn: day(9),
    notes: "Referred by a former classmate.",
    resumeId: resume.id,
    analysis,
    analyzedAt: Date.now() - 10 * 86_400_000,
  },
  {
    id: "example-2",
    title: "Business Intelligence Analyst",
    company: "Summit Outdoor Co.",
    url: "",
    location: "Remote",
    description: "BI analyst to own Tableau dashboards for retail and e-commerce.",
    status: "Interviewing",
    createdAt: Date.now() - 16 * 86_400_000,
    appliedOn: day(15),
    notes: "Second-round interview Tuesday.",
    resumeId: resume.id,
    analysis: { ...analysis, jobTitle: "Business Intelligence Analyst", company: "Summit Outdoor Co.", score: 81, breakdown: { skills: 84, experience: 76, education: 90, keywords: 74 } },
  },
  {
    id: "example-3",
    title: "Supply Chain Analyst",
    company: "Granite Peak Foods",
    url: "",
    location: "Fort Collins, CO",
    description: "Analyst for forecasting and inventory planning.",
    status: "Saved",
    createdAt: Date.now() - 2 * 86_400_000,
    appliedOn: "",
    notes: "",
    resumeId: resume.id,
    analysis: { ...analysis, jobTitle: "Supply Chain Analyst", company: "Granite Peak Foods", score: 64, breakdown: { skills: 60, experience: 70, education: 90, keywords: 52 } },
  },
  {
    id: "example-4",
    title: "Junior Data Scientist",
    company: "Aspen Health",
    url: "",
    location: "Remote",
    description: "Machine learning role requiring Python and modeling experience.",
    status: "Rejected",
    createdAt: Date.now() - 30 * 86_400_000,
    appliedOn: day(28),
    notes: "",
    resumeId: resume.id,
    analysis: { ...analysis, jobTitle: "Junior Data Scientist", company: "Aspen Health", score: 41, breakdown: { skills: 35, experience: 45, education: 80, keywords: 30 } },
  },
  {
    id: "example-5",
    title: "Operations Analyst",
    company: "Front Range Transit",
    url: "",
    location: "Denver, CO",
    description: "Operations analyst for route performance.",
    status: "Applied",
    createdAt: Date.now() - 4 * 86_400_000,
    appliedOn: day(3),
    notes: "",
    resumeId: resume.id,
  },
];

export function exampleData(): Pick<AppData, "resumes" | "activeResumeId" | "jobs"> {
  return { resumes: [resume], activeResumeId: resume.id, jobs };
}

export const isExampleId = (id: string) => id.startsWith("example-");

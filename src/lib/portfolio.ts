export const profile = {
  name: "Fahad E. M. S. Alazmi",
  shortName: "Fahad Alazmi",
  title: "Computer Science & Cybersecurity Undergraduate",
  location: "Kuwait",
  email: "Alazmifahadeid@gmail.com",
  phone: "+965 6562 7601",
  /** Public Google appointment page — anyone can pick a time here. */
  googleBookingUrl: "https://calendar.app.google/8hf1fGSVRdKNrYWg7",
  summary:
    "Cybersecurity-focused computer science student at the International University of Kuwait, with hands-on exposure to enterprise IT operations in healthcare, Cisco networking and security certifications, and hackathon experience in incident response. Currently open to internships and entry-level opportunities in cybersecurity, networking and IT operations.",
  openToWork: "Open to internships & opportunities",
};

export const education = [
  {
    school: "International University of Kuwait (IUK)",
    degree: "B.Sc. Computer Science and Cybersecurity",
    timeline: "2022 — Expected Spring 2027",
    details:
      "Relevant coursework: Network Security, Incident Response, Operating Systems, Data Analysis.",
  },
];

export const experience = [
  {
    org: "Dar Al Shifa Hospital",
    role: "IT / Cybersecurity Observer (Externship)",
    timeline: "June 2026 — July 2026",
    points: [
      "Observed daily healthcare IT operations, enterprise network infrastructure management and system administration workflows.",
      "Shadowed IT security personnel on threat monitoring, vulnerability assessments and compliance procedures in a critical infrastructure setting.",
    ],
  },
];

export const certifications = [
  { name: "Cisco Certified: Network Support and Security", issued: "April 2026" },
  { name: "Cisco Certified: Network Basics", issued: "April 2026" },
  { name: "Cisco Certified: Operating System Basics", issued: "December 2025" },
  { name: "IELTS Academic — Overall Band 5.5", issued: "January 2023" },
];

export const events = [
  {
    name: "Kuwait Hackathon Workshop: Incident Response and Recovery — Coded",
    timeline: "November 2024",
    points: [
      "Explored AI-driven approaches to detect active cyberattacks and analyse infrastructure vulnerabilities.",
      "Built actionable skills to implement response strategies and safeguard modern information systems.",
    ],
  },
  {
    name: "Kuwait Hackathon — Coded Event",
    timeline: "November 2023",
    points: [
      "Intensive technical challenges focused on cybersecurity fundamentals and collaborative problem solving.",
    ],
  },
];

export const skillGroups = [
  {
    label: "Cybersecurity",
    items: ["Incident Response", "Vulnerability Analysis", "Threat Detection"],
  },
  {
    label: "Networking & Systems",
    items: ["Network Architecture Basics", "Windows Administration", "Linux Administration"],
  },
  {
    label: "Data Science",
    items: ["Data Analysis", "Statistical Processing", "Structured Data Management"],
  },
];

/** Compact plain-text profile used as grounding for the AI assistant. */
export function portfolioFacts(): string {
  return [
    `${profile.name} — ${profile.title}, based in ${profile.location}.`,
    `Contact: ${profile.email}, ${profile.phone}.`,
    profile.summary,
    "Education: " + education.map((e) => `${e.degree}, ${e.school} (${e.timeline}). ${e.details}`).join(" "),
    "Experience: " +
      experience.map((e) => `${e.role} at ${e.org} (${e.timeline}): ${e.points.join(" ")}`).join(" "),
    "Certifications: " + certifications.map((c) => `${c.name} (${c.issued})`).join("; ") + ".",
    "Hackathons and workshops: " +
      events.map((e) => `${e.name} (${e.timeline}): ${e.points.join(" ")}`).join(" "),
    "Skills: " + skillGroups.map((g) => `${g.label} — ${g.items.join(", ")}`).join("; ") + ".",
  ].join("\n");
}

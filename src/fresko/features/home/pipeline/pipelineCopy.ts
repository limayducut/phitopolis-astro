import { CONTENT } from "@/shared/content";

export const NARRATION_SOURCE =
  "Founded in 2019 by international industry veterans, Phitopolis stands behind the cloud data pipelines and applications that modern financial markets depend on. Engineers, researchers and operators work as one team, shaping platforms, modelling complex data and keeping production steady around the clock for clients worldwide. Tomorrow's technology, made available today, with room for the next generation of technologists to grow alongside it.";

/** Owner-approved display heading; the vision statement itself comes from CONTENT. */
export const VISION_HEADING = "Our vision";
/** Verbatim brand-register cut from CONTENT.hero.vision.body. */
export const VISION_GOLD_PHRASE = "Cloud-based Financial Data Pipelines and Applications";

export const CHAPTERS = {
  research: {
    kicker: "Modelling complex data",
    pillarId: "01",
  },
  development: {
    kicker: "Shaping platforms",
    pillarId: "02",
  },
  support: {
    kicker: "Keeping production steady around the clock",
    pillarId: "03",
  },
} as const;

/** One beat per sentence of each pillar's IDENTITY §6 paragraph, verbatim
 *  (owner, 2026-10-13: "sentence N = beats"), closing period dropped. */
export const CHAPTER_BEATS = {
  research: [
    "Our research team is focused on data science projects utilizing statistics, machine learning and AI to help model large, noisy and complex data sets",
    "Having clients in quantitative finance, data and financial technology there is no shortage of interesting problems to solve",
  ],
  development: [
    "We love building systems, especially those leveraging data science, machine learning and big data expertise",
    "Our seasoned team of developers use all of the latest languages, tools and methodologies to deliver products designed to run within public or private cloud environments and provide maximum value to end users",
  ],
  support: [
    "Our clients use global, complex systems",
    "Phitopolis is here to provide them smart, efficient and talented staff exhibiting excellent communication skills ready to support their users",
  ],
} as const satisfies Record<keyof typeof CHAPTERS, readonly string[]>;

export const JOB_SOURCES = {
  quantitativeResearcher: {
    title: "Quantitative Researcher",
    sentence:
      "In this role, you will apply mathematical and statistical techniques and engineering software to develop, analyze and implement models to produce financial trading signals.",
    stack: [
      "Proficiency in developing data related software in Python",
      "Understanding of and ability to implement Machine Learning algorithms, both supervised and unsupervised",
      "Experience with Deep Learning algorithms",
      "Proficiency in source control tools and collaborative development such as Git",
      "Familiarity with CI/CD technologies to smoothly delivery software releases",
    ],
  },
  dataScientist: {
    title: "Data Scientist",
    sentence:
      "In this role, you will use problem solving skills and good software engineering practices to design, develop, and deploy software solutions and data pipelines to create new data products to be used by researchers and quantitative traders.",
    stack: [
      "Proficiency in developing data related software in Python",
      "Knowledge on Linux, AWS, Databases (document DB and RDBMS), and Docker",
    ],
  },
  softwareEngineer: {
    title: "Software Engineer",
    sentence:
      "You will engage in the development of infrastructure that makes the modern day data driven applications in financial services possible.",
    stack: [
      "Experience writing production code in any systems development programming language like C++, Java, Python, Rust, and Go",
      "Must be comfortable with working in a Linux environment",
      "Experience programming an FPGA",
    ],
  },
  fullStackDeveloper: {
    title: "Full Stack Developer",
    sentence:
      "The primary responsibility of this role is to build and maintain production-level software applications which includes implementing responsive and interactive user interfaces, developing reliable backend modules and/or APIs, and making key database decisions.",
    stack: [
      "Proficiency in Javascript and Typescript",
      "Skills on JS library/frameworks specifically ReactJS, ExpressJS, Apollo, and NestJS",
      "Knowledge of standard API methodologies such as Rest and GraphQL",
      "Knowledge on working with Postgres and Mongo databases",
      "Familiarity with production deployment and CI/CD",
    ],
  },
  devOpsEngineer: {
    title: "DevOps Engineer",
    sentence:
      "In this role, you will have opportunities in coding, building, testing, releasing, configuring, administering and monitoring of infrastructure and applications deployed on-premise and in the cloud.",
    stack: [
      "Operations and support for High Frequency Stock Trading, Financial Market Data Pipelines and Cloud Platforms including AWS, GCP and Azure",
      "Configuration and maintenance of application services using automation tools and CI/CD pipelines that the team will develop and maintain",
      "Maintain and improve monitoring of the platform and ownership of these tools/dashboards using Prometheus/Grafana and others",
      "Must have fundamental UNIX/Linux knowledge with strong command line skills",
      "Experience in shell scripting and Python programming",
    ],
  },
} as const;

export const TEAM_CARDS = [
  {
    chapter: "research",
    source: JOB_SOURCES.quantitativeResearcher,
    line: "mathematical and statistical techniques",
    stackSources: JOB_SOURCES.quantitativeResearcher.stack,
    chips: ["Python", "Machine Learning", "Deep Learning", "Git", "CI/CD"],
  },
  {
    chapter: "research",
    source: JOB_SOURCES.dataScientist,
    line: "software solutions and data pipelines",
    stackSources: JOB_SOURCES.dataScientist.stack,
    chips: ["Python", "Linux", "AWS", "Databases", "Docker"],
  },
  {
    chapter: "development",
    source: JOB_SOURCES.softwareEngineer,
    line: "the development of infrastructure",
    stackSources: JOB_SOURCES.softwareEngineer.stack,
    chips: ["C++", "Java", "Python", "Rust", "Go", "Linux", "FPGA"],
  },
  {
    chapter: "development",
    source: JOB_SOURCES.fullStackDeveloper,
    line: "responsive and interactive user interfaces",
    stackSources: JOB_SOURCES.fullStackDeveloper.stack,
    chips: [
      "Javascript",
      "Typescript",
      "ReactJS",
      "ExpressJS",
      "Apollo",
      "NestJS",
      "GraphQL",
      "Postgres",
      "Mongo",
      "CI/CD",
    ],
  },
  {
    chapter: "support",
    source: JOB_SOURCES.devOpsEngineer,
    line: "applications deployed on-premise and in the cloud",
    stackSources: JOB_SOURCES.devOpsEngineer.stack,
    chips: ["AWS", "GCP", "Azure", "Prometheus/Grafana", "UNIX/Linux", "CI/CD", "Python"],
  },
] as const;

/** The closing statement: the gold phrase is an exact substring. */
export const CLOSING_STATEMENT = "Tomorrow's technology, made available today";
export const CLOSING_GOLD = "made available today";

export const OFFICIAL_DESCRIPTIONS = Object.fromEntries(
  CONTENT.hero.salesPitch.pillars.map((pillar) => [pillar.id, pillar.officialDescription]),
);

/** Copy still read at runtime: the home Vision line, the pillar chapters, and
 *  the contact addresses. */
export const CONTENT = {
  hero: {
    vision: {
      body: "To be recognised as the premier provider of Cloud-based Financial Data Pipelines and Applications in the Philippines",
    },
    salesPitch: {
      pillars: [
        {
          id: "01",
          name: "Research Pillar",
          officialDescription:
            "Our research team is focused on data science projects utilizing statistics, machine learning and AI to help model large, noisy and complex data sets. Having clients in quantitative finance, data and financial technology there is no shortage of interesting problems to solve.",
          // New photo (owner, 2026-10-23). A new photo gets a new file name: browsers
          // that cached the old one under the same name kept showing it.
          image: "/images/pillars-hd/research-desk-team-hd.webp",
          alt: "Three researchers in Phitopolis hoodies working through code at a desk",
        },
        {
          id: "02",
          name: "Development Pillar",
          officialDescription:
            "We love building systems, especially those leveraging data science, machine learning and big data expertise. Our seasoned team of developers use all of the latest languages, tools and methodologies to deliver products designed to run within public or private cloud environments and provide maximum value to end users.",
          image: "/images/pillars-hd/development-whiteboard-hd.webp",
          alt: "Developers reviewing code together at a laptop",
        },
        {
          id: "03",
          name: "Support Pillar",
          officialDescription:
            "Our clients use global, complex systems. Phitopolis is here to provide them smart, efficient and talented staff exhibiting excellent communication skills ready to support their users.",
          // Final photo (owner, 2026-10-30), under a new file name so a cached copy of
          // the old one is never shown in its place.
          image: "/images/pillars-hd/support-meeting-hd.webp",
          alt: "Five Phitopolis team members in company polos gathered around laptops at a meeting table",
        },
      ],
    },
  },
  /** Restored for T-041 (`AboutValues`): the 4 core values, each with the
   *  definition shown on the stage and a client-facing line kept for parity
   *  with the original content even though `AboutValues` itself no longer
   *  renders `valueToClient` (owner call, 2026-10-09). */
  principles: {
    values: [
      {
        label: "Integrity",
        definition:
          "We operate with honesty and transparency in every interaction. Our word is our bond.",
        valueToClient:
          "Trust and predictability: truthful reporting and ethical decisions that reduce risk and keep partnerships stable.",
      },
      {
        label: "Accountability",
        definition:
          "We take full ownership of our commitments and results, and stand behind our output without excuses.",
        valueToClient:
          "Reliability: by owning wins and setbacks alike, we manage outcomes proactively to hit every milestone.",
      },
      {
        label: "Forward Thinking",
        definition:
          "We don't just solve today's problems; we anticipate tomorrow's through deliberate strategy.",
        valueToClient:
          "A competitive edge: a proactive read on technology and market shifts keeps your business ready to scale.",
      },
      {
        label: "Excellence",
        definition:
          "We set a high bar for performance and continuously refine our process to deliver quality.",
        valueToClient:
          "Fewer errors, higher efficiency, and a product that exceeds expectations, maximizing return on every engagement.",
      },
    ],
  },
  contact: {
    address:
      "27/F Ecotower Building, 32nd St. cor. 9th Avenue, Bonifacio Global City, Taguig, Philippines, 1634",
    careersEmail: "jobs@phitopolis.com",
    generalInquiries: "info@phitopolis.com",
  },
};

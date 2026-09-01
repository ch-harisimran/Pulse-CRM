import "dotenv/config";
import { PrismaClient, DealStage, CustomerStatus, ActivityType } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

const SERVICE_LINES = [
  "Brand Identity Refresh",
  "Website Redesign",
  "SEO Retainer",
  "Paid Media Campaign",
  "Social Media Management",
  "Content Strategy",
  "Email Marketing Program",
  "Product Launch Campaign",
  "Video Production",
  "Marketing Automation Setup",
  "Annual Retainer",
  "Landing Page Sprint",
  "Rebrand & Style Guide",
  "Conversion Rate Audit",
  "Influencer Partnership Program",
];

function randomFromLastNDays(days: number) {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.report.deleteMany();
  await prisma.dashboardLayout.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.scheduledReportSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("Creating tenant: Brightpath Studio...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Brightpath Studio",
      slug: "brightpath-studio",
      integrations: {
        create: [
          { key: "slack", enabled: true },
          { key: "zapier", enabled: false },
          { key: "google_sheets", enabled: true },
        ],
      },
      scheduledReport: { create: { enabled: false } },
    },
  });

  const [morgan, jordan, casey] = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: "Morgan Reyes",
        email: "morgan@brightpathstudio.com",
        passwordHash,
        role: "admin",
        avatarColor: "#10B981",
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: "Jordan Patel",
        email: "jordan@brightpathstudio.com",
        passwordHash,
        role: "admin",
        avatarColor: "#0EA5E9",
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: "Casey Nguyen",
        email: "casey@brightpathstudio.com",
        passwordHash,
        role: "member",
        avatarColor: "#F59E0B",
      },
    }),
  ]);
  const users = [morgan, jordan, casey];

  console.log("Creating 50 customers...");
  const statusWeights: CustomerStatus[] = [
    ...Array(28).fill("active" as CustomerStatus),
    ...Array(14).fill("lead" as CustomerStatus),
    ...Array(8).fill("churned" as CustomerStatus),
  ];

  const customers = [];
  for (let i = 0; i < 50; i++) {
    const companyName = faker.company.name();
    const contactFirst = faker.person.firstName();
    const contactLast = faker.person.lastName();
    const status = statusWeights[i];
    const createdAt = randomFromLastNDays(220);
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: `${contactFirst} ${contactLast}`,
        email: faker.internet.email({ firstName: contactFirst, lastName: contactLast, provider: faker.internet.domainName() }).toLowerCase(),
        company: companyName,
        status,
        createdAt,
      },
    });
    customers.push(customer);
  }

  console.log("Creating 80 deals across the last 6 months...");
  const stagePlan: DealStage[] = [
    ...Array(35).fill("won" as DealStage),
    ...Array(20).fill("lost" as DealStage),
    ...Array(25).fill("open" as DealStage),
  ];
  for (let i = stagePlan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stagePlan[i], stagePlan[j]] = [stagePlan[j], stagePlan[i]];
  }

  const deals = [];
  for (let i = 0; i < 80; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const stage = stagePlan[i];
    const service = SERVICE_LINES[Math.floor(Math.random() * SERVICE_LINES.length)];
    const isBig = Math.random() < 0.12;
    const value = isBig
      ? Math.round(faker.number.int({ min: 40000, max: 90000 }) / 500) * 500
      : Math.round(faker.number.int({ min: 1800, max: 26000 }) / 100) * 100;

    const createdAt = randomFromLastNDays(180);
    let closeDate: Date;
    if (stage === "open") {
      closeDate = addDays(new Date(), faker.number.int({ min: 3, max: 60 }));
    } else {
      closeDate = addDays(createdAt, faker.number.int({ min: 7, max: 75 }));
      if (closeDate > new Date()) closeDate = new Date();
    }

    const deal = await prisma.deal.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        title: `${customer.company} — ${service}`,
        value,
        stage,
        closeDate,
        createdAt,
      },
    });
    deals.push(deal);
  }

  console.log("Creating activity feed (30 entries)...");
  type ActEntry = { type: ActivityType; description: string; createdAt: Date; userId: string };
  const activityPool: ActEntry[] = [];

  const sampleDeals = [...deals].sort(() => Math.random() - 0.5).slice(0, 14);
  for (const d of sampleDeals) {
    const customer = customers.find((c) => c.id === d.customerId)!;
    const user = users[Math.floor(Math.random() * users.length)];
    if (d.stage === "won") {
      activityPool.push({
        type: "deal_won",
        description: `${user.name} closed "${d.title}" as won ($${d.value.toLocaleString()})`,
        createdAt: d.closeDate,
        userId: user.id,
      });
    } else if (d.stage === "lost") {
      activityPool.push({
        type: "deal_lost",
        description: `${user.name} marked "${d.title}" as lost`,
        createdAt: d.closeDate,
        userId: user.id,
      });
    } else {
      activityPool.push({
        type: "deal_created",
        description: `${user.name} created a new deal for ${customer.company}: "${d.title}"`,
        createdAt: d.createdAt,
        userId: user.id,
      });
    }
  }

  const sampleCustomers = [...customers].sort(() => Math.random() - 0.5).slice(0, 9);
  for (const c of sampleCustomers) {
    const user = users[Math.floor(Math.random() * users.length)];
    activityPool.push({
      type: "customer_added",
      description: `${user.name} added new customer contact ${c.name} at ${c.company}`,
      createdAt: c.createdAt,
      userId: user.id,
    });
  }

  activityPool.push(
    { type: "member_invited", description: `${jordan.name} invited casey@brightpathstudio.com to join as a member`, createdAt: randomFromLastNDays(160), userId: jordan.id },
    { type: "member_joined", description: `${casey.name} joined the Brightpath Studio workspace`, createdAt: randomFromLastNDays(155), userId: casey.id },
    { type: "member_invited", description: `${morgan.name} invited jordan@brightpathstudio.com to join as an admin`, createdAt: randomFromLastNDays(200), userId: morgan.id },
    { type: "member_joined", description: `${jordan.name} joined the Brightpath Studio workspace`, createdAt: randomFromLastNDays(198), userId: jordan.id },
    { type: "settings_changed", description: `${morgan.name} enabled the Slack integration`, createdAt: randomFromLastNDays(90), userId: morgan.id },
    { type: "settings_changed", description: `${morgan.name} connected Google Sheets export`, createdAt: randomFromLastNDays(75), userId: morgan.id },
    { type: "report_generated", description: `${morgan.name} generated an AI executive summary for Q2`, createdAt: randomFromLastNDays(45), userId: morgan.id },
    { type: "report_generated", description: `${jordan.name} generated an AI executive summary for the trailing 30 days`, createdAt: randomFromLastNDays(20), userId: jordan.id },
    { type: "report_generated", description: `${morgan.name} generated an AI executive summary for the current period`, createdAt: randomFromLastNDays(3), userId: morgan.id }
  );

  activityPool.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const finalActivities = activityPool.slice(0, 30);

  for (const a of finalActivities) {
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        userId: a.userId,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt,
      },
    });
  }

  console.log("Creating 3 AI reports...");
  const now = new Date();
  const period1Start = addDays(now, -120);
  const period1End = addDays(now, -90);
  const period2Start = addDays(now, -60);
  const period2End = addDays(now, -30);
  const period3Start = addDays(now, -30);
  const period3End = now;

  await prisma.report.create({
    data: {
      tenantId: tenant.id,
      generatedBy: morgan.id,
      title: "Executive Summary — Q2 Performance Review",
      periodStart: period1Start,
      periodEnd: period1End,
      createdAt: addDays(now, -88),
      content: `## Executive Summary

Brightpath Studio closed the period with steady momentum across the client portfolio. Total booked revenue from won deals reached approximately $184,300 across 11 closed-won engagements, while 6 opportunities were lost, primarily in the paid media and rebrand categories.

**Key Insights**

1. Retainer-based engagements (SEO and social media management) continue to be the most reliable revenue source, showing the highest close rate of any service line at 68%.
2. Website Redesign projects carried the largest average deal size ($14,200) but also the longest sales cycle, averaging 52 days from creation to close.
3. Three customers in the hospitality and food & beverage verticals accounted for nearly 22% of total won value this period, suggesting a concentration risk worth monitoring.
4. Lost deals skewed toward first-time prospects rather than existing customers, indicating the pipeline's top-of-funnel qualification could be tightened.
5. Casey Nguyen's customer additions this period (9 new contacts) outpaced deal creation, pointing to a healthy but not-yet-converted pipeline.

**Recommendations**

- Introduce a lightweight discovery-call scorecard to improve qualification before deals enter the pipeline, targeting the lost-deal pattern above.
- Consider bundling SEO retainers with new Website Redesign engagements to shorten the sales cycle on the highest-value service line.`,
    },
  });

  await prisma.report.create({
    data: {
      tenantId: tenant.id,
      generatedBy: jordan.id,
      title: "Executive Summary — Trailing 30 Days",
      periodStart: period2Start,
      periodEnd: period2End,
      createdAt: addDays(now, -18),
      content: `## Executive Summary

Momentum accelerated over the trailing 30 days, with the team closing several mid-sized retainers and one large annual contract. Won revenue for the period came in at roughly $97,600 across 13 deals, against $31,200 in losses across 7 deals — a win rate of about 65%, up from the prior period.

**Key Insights**

1. The "Annual Retainer" service line produced the single largest deal of the quarter, a $68,000 engagement, materially lifting average deal size for the period.
2. Paid Media Campaign deals showed improved close rates after the team began attaching performance benchmarks to proposals.
3. Customer status mix shifted slightly toward "active," with several long-standing leads converting after multiple touchpoints.
4. A small cluster of churned customers in the fashion and consumer goods verticals suggests seasonal budget cuts rather than dissatisfaction, based on deal notes.
5. Morgan Reyes and Jordan Patel jointly drove 80% of closed-won value, while Casey Nguyen's pipeline contributions were concentrated in net-new customer additions.

**Recommendations**

- Formalize the performance-benchmark approach used in Paid Media proposals and apply it to Website Redesign pitches to replicate the close-rate lift.
- Set a quarterly check-in cadence with churned fashion and consumer goods accounts to re-engage ahead of their next budget cycle.`,
    },
  });

  await prisma.report.create({
    data: {
      tenantId: tenant.id,
      generatedBy: morgan.id,
      title: "Executive Summary — Current Period",
      periodStart: period3Start,
      periodEnd: period3End,
      createdAt: addDays(now, -2),
      content: `## Executive Summary

The current period shows a healthy, diversified pipeline with 25 open opportunities worth a combined $312,400 in potential value. Closed-won revenue so far stands at $88,900 across 9 deals, with win rate holding steady at roughly 64% against closed-lost deals.

**Key Insights**

1. Open pipeline value is up 18% versus the equivalent point in the prior period, driven largely by new Brand Identity Refresh and Product Launch Campaign opportunities.
2. Average time-to-close for won deals has tightened to 41 days, down from 52 days two periods ago, likely reflecting the discovery-call scorecard introduced earlier this year.
3. E-commerce and SaaS clients now represent the two largest verticals by open pipeline value, together accounting for just under 40% of unclosed opportunity value.
4. Two large open deals (a $52,000 rebrand and a $47,000 annual retainer) are past their original close date and warrant a status check to avoid slippage.
5. New customer acquisition remains steady, with active accounts now outnumbering leads by roughly 2 to 1.

**Recommendations**

- Prioritize a status review on the two overdue large opportunities this week to protect forecasted revenue.
- Lean into the e-commerce and SaaS verticals with tailored case studies, given their growing share of pipeline value.`,
    },
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Demo login credentials (all users share the same password):");
  console.log(`  Admin:  morgan@brightpathstudio.com / ${DEMO_PASSWORD}`);
  console.log(`  Admin:  jordan@brightpathstudio.com / ${DEMO_PASSWORD}`);
  console.log(`  Member: casey@brightpathstudio.com / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

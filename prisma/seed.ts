import { PrismaClient, type JobCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface CategorySeed {
  name: string;
  slug: string;
  children?: CategorySeed[];
}

const categories: CategorySeed[] = [
  {
    name: 'Teaching',
    slug: 'teaching',
    children: [
      { name: 'Mathematics', slug: 'teaching-mathematics' },
      { name: 'Chemistry', slug: 'teaching-chemistry' },
      { name: 'Science', slug: 'teaching-science' },
      { name: 'Homeroom', slug: 'teaching-homeroom' },
    ],
  },
  {
    name: 'Software Engineering',
    slug: 'software-engineering',
    children: [
      { name: 'Frontend', slug: 'software-frontend' },
      { name: 'Backend', slug: 'software-backend' },
      { name: 'Full Stack', slug: 'software-full-stack' },
      { name: 'AI Automation', slug: 'software-ai-automation' },
    ],
  },
  {
    name: 'Data Annotation',
    slug: 'data-annotation',
  },
];

async function upsertCategory(seed: CategorySeed, parentId?: string): Promise<JobCategory> {
  const category = await prisma.jobCategory.upsert({
    where: { slug: seed.slug },
    create: {
      name: seed.name,
      slug: seed.slug,
      parentId,
    },
    update: {
      name: seed.name,
      parentId,
    },
  });

  for (const child of seed.children ?? []) {
    await upsertCategory(child, category.id);
  }

  return category;
}

async function main(): Promise<void> {
  for (const category of categories) {
    await upsertCategory(category);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

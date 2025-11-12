// Check creator onboarding status
import { prisma } from '../lib/db/prisma';

async function checkCreatorOnboarding() {
  try {
    // Get all creators and their onboarding status
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        companyId: true,
        companyName: true,
        onboardingCompleted: true,
      },
    });

    console.log('\n📊 Creator Onboarding Status:\n');
    console.log('='.repeat(80));

    creators.forEach((creator, index) => {
      console.log(`\n${index + 1}. ${creator.companyName}`);
      console.log(`   ID: ${creator.id}`);
      console.log(`   Company ID: ${creator.companyId}`);
      console.log(`   Onboarding Completed: ${creator.onboardingCompleted ? '✅ YES' : '❌ NO'}`);
      console.log('-'.repeat(80));
    });

    console.log(`\n📈 Total Creators: ${creators.length}`);
    console.log(`✅ Completed Onboarding: ${creators.filter(c => c.onboardingCompleted).length}`);
    console.log(`❌ Not Completed: ${creators.filter(c => !c.onboardingCompleted).length}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCreatorOnboarding();

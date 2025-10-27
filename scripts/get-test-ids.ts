import { prisma } from '../lib/db/prisma';

async function getTestIds() {
  console.log('🔍 Finding test IDs for screenshots...\n');

  // Get a sample member with membershipId
  const member = await prisma.member.findFirst({
    where: {
      membershipId: { not: '' }
    },
    select: {
      id: true,
      membershipId: true,
      username: true,
      email: true,
      creatorId: true,
    }
  });

  if (member) {
    console.log('✅ Found member:');
    console.log(`   Member ID: ${member.id}`);
    console.log(`   Membership ID: ${member.membershipId}`);
    console.log(`   Username: ${member.username}`);
    console.log(`   Email: ${member.email}`);
    console.log(`   Creator ID: ${member.creatorId}\n`);
  } else {
    console.log('❌ No member with membershipId found\n');
  }

  // Get a sample creator with productId
  const creator = await prisma.creator.findFirst({
    where: {
      productId: { not: '' }
    },
    select: {
      id: true,
      productId: true,
      companyName: true,
    }
  });

  if (creator) {
    console.log('✅ Found creator:');
    console.log(`   Creator ID: ${creator.id}`);
    console.log(`   Product ID: ${creator.productId}`);
    console.log(`   Company Name: ${creator.companyName}\n`);
  } else {
    console.log('❌ No creator with productId found\n');
  }

  console.log('📋 URLs to test:');
  if (member?.membershipId) {
    console.log(`   Member Dashboard: http://localhost:3002/customer/${member.membershipId}`);
  }
  if (creator?.productId) {
    console.log(`   Creator Dashboard: http://localhost:3002/seller-product/${creator.productId}`);
  }

  await prisma.$disconnect();
}

getTestIds().catch(console.error);

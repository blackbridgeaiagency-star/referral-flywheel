import { prisma } from '../lib/db/prisma';
import logger from '../lib/logger';


async function getTestIds() {
  logger.info(' Finding test IDs for screenshots...\n');

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
    logger.info('Found member:');
    logger.debug(`   Member ID: ${member.id}`);
    logger.debug(`   Membership ID: ${member.membershipId}`);
    logger.debug(`   Username: ${member.username}`);
    logger.debug(`   Email: ${member.email}`);
    logger.debug(`   Creator ID: ${member.creatorId}\n`);
  } else {
    logger.error('No member with membershipId found\n');
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
    logger.info('Found creator:');
    logger.debug(`   Creator ID: ${creator.id}`);
    logger.debug(`   Product ID: ${creator.productId}`);
    logger.debug(`   Company Name: ${creator.companyName}\n`);
  } else {
    logger.error('No creator with productId found\n');
  }

  logger.info(' URLs to test:');
  if (member?.membershipId) {
    logger.debug(`   Member Dashboard: http://localhost:3002/customer/${member.membershipId}`);
  }
  if (creator?.productId) {
    logger.debug(`   Creator Dashboard: http://localhost:3002/seller-product/${creator.productId}`);
  }

  await prisma.$disconnect();
}

getTestIds().catch(console.error);

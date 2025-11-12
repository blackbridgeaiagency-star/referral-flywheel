#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDashboardData() {
  try {
    console.log('\n📊 DATABASE OVERVIEW\n');
    console.log('='.repeat(70));

    // Creators
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        companyId: true,
        companyName: true,
        _count: {
          select: {
            members: true,
            commissions: true,
          }
        }
      }
    });

    console.log('\n🏢 CREATORS:\n');
    for (const creator of creators) {
      console.log(`   • ${creator.companyName} (${creator.companyId})`);
      console.log(`     Members: ${creator._count.members}`);
      console.log(`     Commissions: ${creator._count.commissions}`);
      console.log(`     Dashboard: http://localhost:3003/seller-product/${creator.companyId}\n`);
    }

    // Members overview
    const totalMembers = await prisma.member.count();
    const organicMembers = await prisma.member.count({ where: { memberOrigin: 'organic' } });
    const referredMembers = await prisma.member.count({ where: { memberOrigin: 'referred' } });
    const membersWithReferrals = await prisma.member.count({ where: { totalReferred: { gt: 0 } } });

    console.log('👥 MEMBERS:\n');
    console.log(`   Total: ${totalMembers}`);
    console.log(`   Organic: ${organicMembers}`);
    console.log(`   Referred: ${referredMembers}`);
    console.log(`   Active Referrers: ${membersWithReferrals}\n`);

    // Commissions overview
    const totalCommissions = await prisma.commission.count();
    const paidCommissions = await prisma.commission.count({ where: { status: 'paid' } });
    const commissionStats = await prisma.commission.aggregate({
      _sum: {
        saleAmount: true,
        memberShare: true,
        creatorShare: true,
        platformShare: true,
      }
    });

    console.log('💰 COMMISSIONS:\n');
    console.log(`   Total: ${totalCommissions}`);
    console.log(`   Paid: ${paidCommissions}`);
    console.log(`   Total Sales: $${(commissionStats._sum.saleAmount || 0).toFixed(2)}`);
    console.log(`   Member Earnings: $${(commissionStats._sum.memberShare || 0).toFixed(2)}`);
    console.log(`   Creator Earnings: $${(commissionStats._sum.creatorShare || 0).toFixed(2)}`);
    console.log(`   Platform Fees: $${(commissionStats._sum.platformShare || 0).toFixed(2)}\n`);

    // Sample members with earnings
    const topEarners = await prisma.member.findMany({
      where: { lifetimeEarnings: { gt: 0 } },
      orderBy: { lifetimeEarnings: 'desc' },
      take: 10,
      select: {
        username: true,
        email: true,
        membershipId: true,
        lifetimeEarnings: true,
        monthlyEarnings: true,
        totalReferred: true,
        memberOrigin: true,
      }
    });

    if (topEarners.length > 0) {
      console.log('🏆 TOP EARNERS:\n');
      for (const member of topEarners) {
        console.log(`   • ${member.username} (${member.email})`);
        console.log(`     Lifetime: $${member.lifetimeEarnings.toFixed(2)} | Monthly: $${member.monthlyEarnings.toFixed(2)} | Referrals: ${member.totalReferred}`);
        console.log(`     Dashboard: http://localhost:3003/customer/${member.membershipId}\n`);
      }
    } else {
      console.log('🏆 TOP EARNERS:\n');
      console.log('   No members with earnings yet.\n');
    }

    // Check for any members at all
    if (totalMembers > 0) {
      const sampleMembers = await prisma.member.findMany({
        take: 5,
        select: {
          username: true,
          email: true,
          membershipId: true,
          lifetimeEarnings: true,
          totalReferred: true,
        }
      });

      console.log('📋 SAMPLE MEMBERS:\n');
      for (const member of sampleMembers) {
        console.log(`   • ${member.username} (${member.email})`);
        console.log(`     Earnings: $${member.lifetimeEarnings.toFixed(2)} | Referrals: ${member.totalReferred}`);
        console.log(`     Dashboard: http://localhost:3003/customer/${member.membershipId}\n`);
      }
    }

    // Invoices
    const invoices = await prisma.invoice.count();
    const invoiceData = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        totalPlatformFees: true,
        commissionCount: true,
        creator: {
          select: {
            companyName: true,
            companyId: true,
          }
        }
      }
    });

    console.log('📄 INVOICES:\n');
    console.log(`   Total: ${invoices}\n`);

    if (invoiceData.length > 0) {
      console.log('📝 RECENT INVOICES:\n');
      for (const invoice of invoiceData) {
        const start = new Date(invoice.periodStart).toLocaleDateString();
        const end = new Date(invoice.periodEnd).toLocaleDateString();
        console.log(`   • ${invoice.creator.companyName}`);
        console.log(`     Period: ${start} - ${end}`);
        console.log(`     Platform Fees: $${invoice.totalPlatformFees.toFixed(2)} (${invoice.commissionCount} commissions)\n`);
      }
    }

    console.log('='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDashboardData();

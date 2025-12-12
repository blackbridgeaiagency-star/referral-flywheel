<objective>
Create the definitive Referral Flywheel master agent - a comprehensive knowledge base and operational guide that serves as the authoritative expert on this entire codebase.

This agent will be spawned whenever deep knowledge of the Referral Flywheel system is needed. It should know:
- Every architectural decision and WHY it was made
- Complete data flow from Whop → Database → UI
- All business logic rules and edge cases
- Troubleshooting guides for common issues
- Security considerations and auth flows

After creating this agent, any future Claude working on this codebase can spawn it to get instant expert-level understanding.
</objective>

<context>
**Prerequisites**: Run AFTER `001-ssot-security-audit.md` completes - use audit findings to inform agent knowledge.

Read these files to build comprehensive knowledge:
- `.claude/CLAUDE.md` - Project mission and architecture
- `.claude/PROGRESS.md` - Development history
- `.claude/DECISIONS.md` - Architecture decisions
- `./reviews/001-prelaunch-audit-report.md` - Recent audit findings
- `prisma/schema.prisma` - Database schema
- All files in `lib/` - Core utilities
- All files in `app/api/` - API routes
- Key dashboard components
</context>

<agent_structure>

## Part 1: Architecture Deep-Dive

### 1.1 System Overview
- What is Referral Flywheel? (elevator pitch)
- Who are the users? (Creators, Members, Platform)
- What problem does it solve?
- Revenue model and commission splits

### 1.2 Tech Stack Decisions
- Why Next.js 14 with App Router?
- Why Prisma with PostgreSQL?
- Why Whop SDK integration?
- Deployment architecture (Vercel)

### 1.3 Database Schema Explained
For each table (Creator, Member, AttributionClick, Commission):
- Purpose and relationships
- Key fields and their meanings
- Indexes and performance considerations
- Common queries

### 1.4 Data Flow Diagrams
- Member signup flow
- Referral attribution flow
- Payment/webhook processing flow
- Commission calculation flow
- Dashboard data loading flow

### 1.5 Business Logic Rules
Document with precision:
- Commission calculation: 10% member, 70% creator, 20% platform
- Attribution window: 30 days
- Tier thresholds (creator-configurable)
- Streak calculation logic
- Rank/leaderboard algorithms

## Part 2: Operational Guide

### 2.1 Key Files Reference
For each critical file:
- Location and purpose
- Dependencies (what it imports)
- Dependents (what imports it)
- Key functions/exports

### 2.2 API Routes Documentation
For each API route:
- Endpoint and method
- Auth requirements
- Request/response format
- Error handling
- Rate limiting considerations

### 2.3 Component Hierarchy
- Dashboard component tree
- Data flow through components
- Shared vs page-specific components

### 2.4 Environment Setup
- Required env vars with descriptions
- Local development setup
- Database connection (Supabase pooler)
- Webhook testing with ngrok

### 2.5 Common Operations
- Adding a new creator
- Testing webhook flows
- Debugging commission calculations
- Checking data consistency

### 2.6 Troubleshooting Guide
Common issues and solutions:
- "Member not found" errors
- Commission not recording
- Dashboard showing stale data
- Webhook failures
- Auth/access issues

## Part 3: Security & Compliance

### 3.1 Authentication Flow
- Whop iframe authentication
- API route protection
- Webhook signature validation

### 3.2 Data Privacy
- What PII is stored?
- Data retention policies
- GDPR considerations

### 3.3 Security Checklist
- Pre-deployment security checks
- Monitoring recommendations
- Incident response

</agent_structure>

<output>
Create the agent definition file at: `./.claude/agents/referral-flywheel-expert.md`

File format:
```markdown
---
name: referral-flywheel-expert
description: Master expert on the Referral Flywheel codebase - architecture, operations, troubleshooting
tools: [Read, Grep, Glob, Bash]
---

# Referral Flywheel Expert Agent

You are the definitive expert on the Referral Flywheel application...

[Complete knowledge base following agent_structure above]

## Quick Reference Commands
- Check member data: `node scripts/check-members.js`
- Verify webhook: `npm run verify:webhook`
- Database studio: `npm run db:studio`

## Decision Tree: Common Questions
When asked about X, check Y first...
```
</output>

<verification>
Before completing:
1. All sections from agent_structure are populated
2. Code examples included where helpful
3. Troubleshooting covers actual issues seen in development
4. Agent can answer: "How does commission calculation work?" with complete accuracy
5. Agent can answer: "Why is member X not seeing their referrals?" with diagnostic steps
6. File follows proper agent definition format for Claude Code
</verification>

<success_criteria>
- Agent file is syntactically correct and can be spawned
- Knowledge covers 100% of the codebase architecture
- Operational guide enables any developer to work on the project
- Troubleshooting covers real scenarios
- Security section is comprehensive
- Agent could pass a "quiz" on any aspect of the system
</success_criteria>

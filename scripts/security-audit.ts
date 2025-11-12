#!/usr/bin/env tsx
/**
 * COMPREHENSIVE SECURITY AUDIT
 * Run this BEFORE every commit to ensure no secrets are exposed
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

// Patterns that indicate potential secrets
const SECRET_PATTERNS = [
  // Database URLs with passwords
  /postgresql:\/\/[^:]+:[^@]+@/gi,
  /mysql:\/\/[^:]+:[^@]+@/gi,
  /mongodb:\/\/[^:]+:[^@]+@/gi,
  /redis:\/\/[^:]+:[^@]+@/gi,

  // API Keys
  /(?:api[_-]?key|apikey|api_secret|api[_-]?token)[\s:="']*([a-zA-Z0-9_\-]{32,})/gi,
  /whop_api_key[\s:="']*([a-zA-Z0-9_\-]{32,})/gi,
  /sk_live_[a-zA-Z0-9]{24,}/gi,
  /pk_live_[a-zA-Z0-9]{24,}/gi,

  // Webhook Secrets
  /(?:webhook[_-]?secret|whsec_)[\s:="']*([a-zA-Z0-9_\-]{32,})/gi,
  /ws_[a-zA-Z0-9]{64}/gi,

  // Admin/Session Secrets
  /(?:admin[_-]?key|admin[_-]?secret|session[_-]?secret|jwt[_-]?secret)[\s:="']*([a-zA-Z0-9_\-]{32,})/gi,

  // AWS
  /AKIA[A-Z0-9]{16}/gi,
  /aws[_-]?secret[_-]?access[_-]?key[\s:="']*([a-zA-Z0-9/+=]{40})/gi,

  // Private Keys
  /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/gi,

  // Generic patterns
  /(?:password|passwd|pwd)[\s:="']*([^"\s']{8,})/gi,
  /(?:token|auth|bearer)[\s:="']*([a-zA-Z0-9_\-\.]{32,})/gi,
];

// Files/directories to skip
const IGNORE_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.env.example',
  '.env.production.example',
  'security-audit.ts',
  'SECURE_KEYS_TEMPLATE.md'
];

// File extensions to check
const CHECK_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.json', '.md', '.txt', '.yml',
  '.yaml', '.sh', '.env', '.config'
];

interface SecurityIssue {
  file: string;
  line: number;
  content: string;
  pattern: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

function shouldCheckFile(filePath: string): boolean {
  // Skip ignored paths
  for (const ignorePath of IGNORE_PATHS) {
    if (filePath.includes(ignorePath)) return false;
  }

  // Check extension
  const ext = path.extname(filePath);
  return CHECK_EXTENSIONS.includes(ext);
}

function scanFile(filePath: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip comments and obvious test data
      if (line.trim().startsWith('//') ||
          line.trim().startsWith('#') ||
          line.includes('test_') ||
          line.includes('example') ||
          line.includes('placeholder') ||
          line.includes('[REPLACE') ||
          line.includes('YOUR_')) {
        return;
      }

      for (const pattern of SECRET_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        const matches = pattern.exec(line);
        if (matches) {
          // Check if it's a real secret or just a variable reference
          const match = matches[0];
          if (!match.includes('process.env') &&
              !match.includes('${') &&
              !match.includes('import ') &&
              !match.includes('require(')) {

            // Determine severity
            let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
            if (match.includes('postgresql://') ||
                match.includes('whop_api') ||
                match.includes('admin_api')) {
              severity = 'HIGH';
            }

            issues.push({
              file: filePath,
              line: index + 1,
              content: line.trim(),
              pattern: pattern.source,
              severity
            });
          }
        }
      }
    });
  } catch (error) {
    // File read error, skip
  }

  return issues;
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);

      // Skip symlinks
      if (fs.lstatSync(filePath).isSymbolicLink()) return;

      if (fs.statSync(filePath).isDirectory()) {
        // Skip ignored directories
        if (!IGNORE_PATHS.includes(file)) {
          getAllFiles(filePath, fileList);
        }
      } else {
        if (shouldCheckFile(filePath)) {
          fileList.push(filePath);
        }
      }
    });
  } catch (error) {
    // Permission error, skip
  }

  return fileList;
}

function checkGitHistory(): boolean {
  console.log(`\n${BLUE}Checking Git History...${RESET}`);

  const suspiciousPatterns = [
    'postgresql://[^:]+:[^@]+@',
    'whop_api_key',
    'admin_api_key',
    'webhook_secret'
  ];

  let hasHistoryIssues = false;

  for (const pattern of suspiciousPatterns) {
    try {
      const result = execSync(
        `git log -S "${pattern}" --oneline --all 2>/dev/null | head -5`,
        { encoding: 'utf8', stdio: 'pipe' }
      );

      if (result.trim()) {
        console.log(`${RED}⚠️  Found potential secrets in git history for pattern: ${pattern}${RESET}`);
        console.log(`${YELLOW}   Commits: ${result.trim().split('\n').length}${RESET}`);
        hasHistoryIssues = true;
      }
    } catch (error) {
      // Git command failed, skip
    }
  }

  return hasHistoryIssues;
}

function checkEnvFiles(): void {
  console.log(`\n${BLUE}Checking .env files...${RESET}`);

  const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];

  envFiles.forEach(envFile => {
    const filePath = path.join(process.cwd(), envFile);
    if (fs.existsSync(filePath)) {
      // Check if it's in .gitignore
      try {
        execSync(`git check-ignore ${envFile}`, { stdio: 'pipe' });
        console.log(`${GREEN}✓ ${envFile} is properly ignored by git${RESET}`);
      } catch {
        console.log(`${RED}✗ ${envFile} is NOT in .gitignore!${RESET}`);
      }
    }
  });
}

async function runSecurityAudit(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${BLUE}🔐 COMPREHENSIVE SECURITY AUDIT${RESET}`);
  console.log(`${'='.repeat(60)}`);

  // 1. Check all files for secrets
  console.log(`\n${BLUE}Scanning files for exposed secrets...${RESET}`);
  const files = getAllFiles(process.cwd());
  console.log(`Found ${files.length} files to check`);

  const allIssues: SecurityIssue[] = [];
  let filesScanned = 0;

  for (const file of files) {
    const issues = scanFile(file);
    allIssues.push(...issues);
    filesScanned++;

    // Show progress
    if (filesScanned % 100 === 0) {
      process.stdout.write(`\rScanned ${filesScanned}/${files.length} files...`);
    }
  }

  console.log(`\rScanned ${filesScanned}/${files.length} files... Done!`);

  // 2. Check .env files
  checkEnvFiles();

  // 3. Check git history
  const hasHistoryIssues = checkGitHistory();

  // 4. Report results
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${BLUE}AUDIT RESULTS${RESET}`);
  console.log(`${'='.repeat(60)}`);

  if (allIssues.length === 0 && !hasHistoryIssues) {
    console.log(`\n${GREEN}✅ NO SECURITY ISSUES FOUND!${RESET}`);
    console.log(`${GREEN}   Your codebase appears to be clean of exposed secrets.${RESET}`);
  } else {
    console.log(`\n${RED}⚠️  SECURITY ISSUES DETECTED!${RESET}\n`);

    // Group by severity
    const highSeverity = allIssues.filter(i => i.severity === 'HIGH');
    const mediumSeverity = allIssues.filter(i => i.severity === 'MEDIUM');
    const lowSeverity = allIssues.filter(i => i.severity === 'LOW');

    if (highSeverity.length > 0) {
      console.log(`${RED}HIGH SEVERITY (${highSeverity.length} issues):${RESET}`);
      highSeverity.slice(0, 5).forEach(issue => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`  ${YELLOW}${issue.content.substring(0, 80)}...${RESET}`);
      });
      if (highSeverity.length > 5) {
        console.log(`  ${YELLOW}... and ${highSeverity.length - 5} more${RESET}`);
      }
    }

    if (mediumSeverity.length > 0) {
      console.log(`\n${YELLOW}MEDIUM SEVERITY (${mediumSeverity.length} issues)${RESET}`);
    }

    if (lowSeverity.length > 0) {
      console.log(`${BLUE}LOW SEVERITY (${lowSeverity.length} issues)${RESET}`);
    }

    if (hasHistoryIssues) {
      console.log(`\n${RED}⚠️  Git History Issues:${RESET}`);
      console.log(`${YELLOW}   Secrets were found in git history.${RESET}`);
      console.log(`${YELLOW}   Consider using BFG Repo-Cleaner or git filter-branch to clean history.${RESET}`);
    }

    console.log(`\n${RED}ACTIONS REQUIRED:${RESET}`);
    console.log('1. Remove any hardcoded secrets from the code');
    console.log('2. Use environment variables instead');
    console.log('3. Regenerate any exposed keys');
    console.log('4. Add sensitive files to .gitignore');
    console.log('5. Clean git history if needed');

    process.exit(1); // Exit with error code
  }

  // 5. Additional recommendations
  console.log(`\n${BLUE}SECURITY RECOMMENDATIONS:${RESET}`);
  console.log('✓ Always use environment variables for secrets');
  console.log('✓ Never commit .env files (except .env.example)');
  console.log('✓ Run this audit before every commit');
  console.log('✓ Use git hooks to automate security checks');
  console.log('✓ Rotate keys every 90 days');
  console.log('✓ Use a secret management service in production');

  console.log(`\n${'='.repeat(60)}\n`);
}

// Run the audit
runSecurityAudit().catch(console.error);
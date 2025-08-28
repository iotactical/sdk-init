/**
 * Setup Command - Setup automation for existing repositories
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { Octokit } = require('@octokit/rest');

const GitHubSetup = require('../../automation/github-setup');
const PATManager = require('../../automation/pat-manager');

class SetupCommand {
  static async execute(repoName, options, command) {
    const globalOptions = command.parent.opts();
    
    console.log(chalk.blue.bold(`⚙️ Setting up automation for: ${repoName}\\n`));
    
    try {
      // Get repository information
      const repoInfo = await this.getRepositoryInfo(repoName, options);
      
      // Check if automation already exists
      if (!options.force) {
        const hasAutomation = await this.checkExistingAutomation(repoInfo);
        if (hasAutomation) {
          const { proceed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'Automation appears to already exist. Continue anyway?',
            default: false
          }]);
          
          if (!proceed) {
            console.log(chalk.yellow('🛑 Setup cancelled'));
            return;
          }
        }
      }
      
      // Setup PAT if not provided
      let pat = options.pat;
      if (!pat) {
        pat = await this.setupPAT(repoInfo);
      }
      
      // Initialize GitHub client
      const octokit = new Octokit({ auth: pat });
      
      // Setup GitHub automation
      await this.setupGitHubAutomation(octokit, repoInfo, globalOptions);
      
      // Setup CI/CD workflows
      await this.setupWorkflows(repoInfo);
      
      // Setup secrets
      await this.setupSecrets(octokit, repoInfo, pat);
      
      // Register with defense-builders-sdk
      await this.registerWithDefenseBuilders(repoInfo, globalOptions);
      
      console.log(chalk.green.bold(`\\n✅ Successfully setup automation for ${repoName}`));
      console.log(chalk.blue('\\n📝 Next steps:'));
      console.log('  1. Review the generated workflow files');
      console.log('  2. Commit and push the changes');
      console.log('  3. Test the CI/CD pipeline');
      console.log('  4. Monitor the first automated build');
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Setup failed:'));
      console.error(chalk.red(error.message));
      
      if (globalOptions.verbose) {
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  }
  
  static async getRepositoryInfo(repoName, options) {
    console.log(chalk.blue('📋 Gathering repository information...'));
    
    // Try to determine organization from current directory or git remote
    let organization = 'iotactical';
    
    try {
      const { execSync } = require('child_process');
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      const match = remoteUrl.match(/github\\.com[:\\/]([^/]+)\\/([^/\\.]+)/);
      if (match) {
        organization = match[1];
        if (!repoName.includes('/')) {
          repoName = match[2]; // Use repo name from git remote
        }
      }
    } catch (error) {
      // Ignore errors, use defaults
    }
    
    const repoInfo = {
      name: repoName,
      organization,
      fullName: `${organization}/${repoName}`,
      localPath: process.cwd()
    };
    
    console.log(chalk.green(`✅ Repository: ${repoInfo.fullName}`));
    return repoInfo;
  }
  
  static async checkExistingAutomation(repoInfo) {
    console.log(chalk.blue('🔍 Checking for existing automation...'));
    
    const workflowPath = path.join(repoInfo.localPath, '.github/workflows/build-and-notify.yml');
    const hasWorkflow = await fs.pathExists(workflowPath);
    
    if (hasWorkflow) {
      console.log(chalk.yellow('⚠️  Found existing CI/CD workflow'));
      return true;
    }
    
    console.log(chalk.green('✅ No existing automation found'));
    return false;
  }
  
  static async setupPAT(repoInfo) {
    console.log(chalk.blue('🔑 Setting up Personal Access Token...'));
    
    const patManager = new PATManager();
    
    // Check for existing PAT in environment
    if (process.env.GITHUB_TOKEN) {
      console.log(chalk.green('✅ Using PAT from environment variable'));
      return process.env.GITHUB_TOKEN;
    }
    
    // Interactive PAT setup
    console.log(chalk.yellow('🔒 GitHub Personal Access Token required'));
    console.log('This token needs the following permissions:');
    console.log('  • repo (Full control of private repositories)');
    console.log('  • workflow (Update GitHub Action workflows)');
    console.log('  • packages (Download/upload packages)');
    console.log();
    console.log('Create a token at: https://github.com/settings/tokens');
    console.log();
    
    const { token } = await inquirer.prompt([{
      type: 'password',
      name: 'token',
      message: 'Enter your GitHub Personal Access Token:',
      mask: '*',
      validate: (input) => {
        if (!input || input.length < 10) {
          return 'Please enter a valid GitHub token';
        }
        return true;
      }
    }]);
    
    // Validate token
    await patManager.validateToken(token);
    console.log(chalk.green('✅ Token validated'));
    
    return token;
  }
  
  static async setupGitHubAutomation(octokit, repoInfo, globalOptions) {
    console.log(chalk.blue('🌐 Setting up GitHub automation...'));
    
    const githubSetup = new GitHubSetup({
      name: repoInfo.name,
      organization: repoInfo.organization,
      octokit
    });
    
    // Setup branch protection
    await githubSetup.setupBranchProtection();
    
    // Setup repository settings
    await githubSetup.configureRepository({
      has_issues: true,
      has_projects: false,
      has_wiki: false,
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: true,
      delete_branch_on_merge: true
    });
    
    console.log(chalk.green('✅ GitHub automation configured'));
  }
  
  static async setupWorkflows(repoInfo) {
    console.log(chalk.blue('🔄 Setting up CI/CD workflows...'));
    
    const workflowsDir = path.join(repoInfo.localPath, '.github/workflows');
    await fs.ensureDir(workflowsDir);
    
    // Copy workflow template from defense-builders-sdk
    const templatePath = '/home/ryan/code/github.com/iotactical/defense-builders-sdk/atak-civ-workflow-template.yml';
    const workflowPath = path.join(workflowsDir, 'build-and-notify.yml');
    
    if (await fs.pathExists(templatePath)) {
      let workflowContent = await fs.readFile(templatePath, 'utf8');
      
      // Customize for this repository
      workflowContent = workflowContent.replace(/atak-civ/g, repoInfo.name);
      workflowContent = workflowContent.replace(/iotactical\\/dbsdk-atak-civ/g, `iotactical/dbsdk-${repoInfo.name}`);
      
      // Remove template comments
      workflowContent = workflowContent.replace(/^# This file should be placed.*\\n/gm, '');
      workflowContent = workflowContent.replace(/^# \\.github\\/workflows.*\\n/gm, '');
      
      await fs.writeFile(workflowPath, workflowContent);
      console.log(chalk.green('✅ CI/CD workflow created'));
    } else {
      console.log(chalk.yellow('⚠️  Could not find workflow template, creating basic workflow'));
      // Create basic workflow if template not found
      await this.createBasicWorkflow(workflowPath, repoInfo);
    }
  }
  
  static async setupSecrets(octokit, repoInfo, pat) {
    console.log(chalk.blue('🔒 Setting up repository secrets...'));
    
    try {
      // Setup DEFENSE_BUILDERS_PAT secret
      await this.createRepositorySecret(octokit, repoInfo, 'DEFENSE_BUILDERS_PAT', pat);
      
      console.log(chalk.green('✅ Repository secrets configured'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not setup secrets automatically'));
      console.log(chalk.blue('Please manually add these secrets to your repository:'));
      console.log(`  • DEFENSE_BUILDERS_PAT: Your GitHub Personal Access Token`);
    }
  }
  
  static async createRepositorySecret(octokit, repoInfo, name, value) {
    // Get repository public key for encryption
    const { data: publicKey } = await octokit.rest.actions.getRepoPublicKey({
      owner: repoInfo.organization,
      repo: repoInfo.name
    });
    
    // Encrypt the secret value
    const sodium = require('tweetsodium');
    const messageBytes = Buffer.from(value);
    const keyBytes = Buffer.from(publicKey.key, 'base64');
    const encryptedBytes = sodium.seal(messageBytes, keyBytes);
    const encryptedValue = Buffer.from(encryptedBytes).toString('base64');
    
    // Create the secret
    await octokit.rest.actions.createOrUpdateRepoSecret({
      owner: repoInfo.organization,
      repo: repoInfo.name,
      secret_name: name,
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id
    });
  }
  
  static async registerWithDefenseBuilders(repoInfo, globalOptions) {
    console.log(chalk.blue('📝 Registering with Defense Builders SDK...'));
    
    if (globalOptions.dryRun) {
      console.log(chalk.yellow('📋 Dry run - would register with defense-builders-sdk'));
      return;
    }
    
    // This would create a PR to defense-builders-sdk to add the new SDK
    console.log(chalk.blue('📋 Manual step: Create PR to defense-builders-sdk'));
    console.log('  Add your SDK configuration to sdk-versions.json');
    console.log(`  Repository: ${repoInfo.fullName}`);
    console.log(`  Container: ghcr.io/iotactical/dbsdk-${repoInfo.name}`);
  }
  
  static async createBasicWorkflow(workflowPath, repoInfo) {
    const basicWorkflow = `name: Build and Notify Defense Builders SDK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: iotactical/dbsdk-${repoInfo.name}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Determine version
        id: version
        run: |
          if [ -f VERSION.txt ]; then
            VERSION=$(cat VERSION.txt | tr -d '\\n\\r')
          else
            VERSION="0.0.0"
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          
      - name: Build and push Docker image
        run: |
          echo "Building ${repoInfo.name} SDK version ${{ steps.version.outputs.version }}"
          # Add your build steps here
          
      - name: Notify Defense Builders SDK
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: peter-evans/repository-dispatch@v2
        with:
          token: \${{ secrets.DEFENSE_BUILDERS_PAT }}
          repository: iotactical/defense-builders-sdk
          event-type: sdk-update
          client-payload: |
            {
              "sdk_name": "${repoInfo.name}",
              "version": "\${{ steps.version.outputs.version }}",
              "container_image": "\${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:\${{ steps.version.outputs.version }}",
              "is_latest": true
            }`;
    
    await fs.writeFile(workflowPath, basicWorkflow);
  }
}

module.exports = SetupCommand;
/**
 * Create Command - Generate new SDK collection repositories
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Handlebars = require('handlebars');
const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');

const TemplateEngine = require('../../automation/template-engine');
const GitHubSetup = require('../../automation/github-setup');
const Validator = require('../../validation/validators');

class CreateCommand {
  static async execute(name, options, command) {
    const globalOptions = command.parent.opts();
    
    console.log(chalk.blue.bold(`🚀 Creating SDK collection: ${name}\\n`));
    
    try {
      // Validate inputs
      await this.validateInputs(name, options);
      
      // Collect GitHub App token for gist management
      const githubAppToken = await this.collectGitHubAppToken(options);
      
      // Generate configuration
      const config = await this.generateConfig(name, options, githubAppToken);
      
      if (globalOptions.dryRun) {
        console.log(chalk.yellow('📋 Dry run - showing what would be created:\\n'));
        this.showDryRunOutput(config);
        return;
      }
      
      // Create repository structure
      const repoPath = await this.createRepositoryStructure(config);
      
      // Setup GitHub repository
      if (!globalOptions.skipGithub) {
        await this.setupGitHubRepository(config);
      }
      
      // Setup automation
      await this.setupAutomation(config, repoPath);
      
      // Validate created structure
      await this.validateCreatedStructure(repoPath);
      
      console.log(chalk.green.bold(`\\n✅ Successfully created SDK collection: ${name}`));
      console.log(chalk.blue(`📁 Local path: ${repoPath}`));
      console.log(chalk.blue(`🌐 GitHub: https://github.com/${config.organization}/${name}`));
      console.log(chalk.yellow('\\n📝 Next steps:'));
      console.log('  1. Review and customize the generated files');
      console.log('  2. Add your SDK files to the appropriate directories');
      console.log('  3. Configure GitHub secrets (PAT tokens)');
      console.log('  4. Push changes and test the CI/CD workflow');
      console.log('  5. Submit PR to defense-builders-sdk to register your SDK');
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Error creating SDK collection:'));
      console.error(chalk.red(error.message));
      
      if (globalOptions.verbose) {
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  }
  
  static async validateInputs(name, options) {
    // Validate SDK name
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new Error('SDK name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens');
    }
    
    // Validate SDK type
    const validTypes = ['mobile-android', 'desktop-windows', 'server', 'web', 'embedded'];
    if (options.type && !validTypes.includes(options.type)) {
      throw new Error(`Invalid SDK type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate language compatibility
    if (options.type && options.language) {
      const compatibleLanguages = {
        'mobile-android': ['java', 'kotlin'],
        'desktop-windows': ['csharp', 'cpp'],
        'server': ['java', 'javascript', 'python', 'go'],
        'web': ['javascript', 'typescript'],
        'embedded': ['cpp', 'c', 'rust']
      };
      
      if (!compatibleLanguages[options.type].includes(options.language)) {
        throw new Error(`Language ${options.language} not compatible with type ${options.type}`);
      }
    }
    
    console.log(chalk.green('✅ Input validation passed'));
  }
  
  static async collectGitHubAppToken(options) {
    // Check if token provided via option
    if (options.githubAppToken) {
      return options.githubAppToken;
    }
    
    // Check environment variable
    if (process.env.GIST_TOKEN) {
      console.log(chalk.green('✅ Using GitHub App token from environment'));
      return process.env.GIST_TOKEN;
    }
    
    // Interactive prompt
    console.log(chalk.blue.bold('🔐 GitHub App Token Required'));
    console.log('This token is needed for SDK collection CI to manage its gist registry.');
    console.log('The token should have the following permissions:');
    console.log('  • repo (Full control of private repositories)');
    console.log('  • gist (Create/update gists)');
    console.log('  • workflow (Update GitHub Action workflows)');
    console.log();
    
    const inquirer = require('inquirer');
    const { token } = await inquirer.prompt([{
      type: 'password',
      name: 'token',
      message: 'Enter your GitHub App token:',
      mask: '*',
      validate: (input) => {
        if (!input || input.length < 10) {
          return 'Please enter a valid GitHub App token';
        }
        if (!input.startsWith('ghp_') && !input.startsWith('github_pat_') && !input.startsWith('ghs_')) {
          return 'Token should start with "ghp_", "github_pat_", or "ghs_"';
        }
        return true;
      }
    }]);
    
    console.log(chalk.green('✅ GitHub App token collected'));
    return token;
  }
  
  static async generateConfig(name, options, githubAppToken) {
    const config = {
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '),
      description: options.description || `${name} SDK for Defense Builders`,
      organization: options.org || 'iotactical',
      type: options.type || 'mobile-android',
      language: options.language || 'java',
      isPrivate: options.private || false,
      
      // GitHub App token for gist management
      githubAppToken,
      
      // Container configuration
      containerBase: options.containerBase || this.getDefaultContainerBase(options.type, options.language),
      containerName: `ghcr.io/iotactical/dbsdk-${name}`,
      
      // Version configuration  
      javaVersion: options.javaVersion || '11',
      dotnetVersion: options.dotnetVersion || '8.0',
      nodeVersion: options.nodeVersion || '18',
      gradleVersion: options.gradleVersion || '7.6',
      androidApi: options.androidApi || '30',
      
      // Paths
      templatePath: path.join(__dirname, '../../templates'),
      outputPath: path.join(process.cwd(), name),
      
      // Timestamps
      createdAt: new Date().toISOString(),
      year: new Date().getFullYear()
    };
    
    console.log(chalk.blue(`📋 Generated configuration for ${config.displayName}`));
    return config;
  }
  
  static getDefaultContainerBase(type, language) {
    const defaults = {
      'mobile-android': {
        java: 'openjdk:11-jdk',
        kotlin: 'openjdk:11-jdk'
      },
      'desktop-windows': {
        csharp: 'mcr.microsoft.com/dotnet/sdk:8.0',
        cpp: 'mcr.microsoft.com/windows/servercore:ltsc2022'
      },
      'server': {
        java: 'openjdk:11-jdk',
        javascript: 'node:18-alpine',
        python: 'python:3.11-slim',
        go: 'golang:1.21-alpine'
      },
      'web': {
        javascript: 'node:18-alpine',
        typescript: 'node:18-alpine'
      },
      'embedded': {
        cpp: 'gcc:latest',
        c: 'gcc:latest',
        rust: 'rust:latest'
      }
    };
    
    return defaults[type]?.[language] || 'ubuntu:22.04';
  }
  
  static async createRepositoryStructure(config) {
    console.log(chalk.blue('📁 Creating repository structure...'));
    
    // Ensure output directory exists and is empty
    if (await fs.pathExists(config.outputPath)) {
      throw new Error(`Directory ${config.outputPath} already exists`);
    }
    
    await fs.ensureDir(config.outputPath);
    
    // Copy and process templates
    const templateEngine = new TemplateEngine(config);
    await templateEngine.processTemplates();
    
    console.log(chalk.green('✅ Repository structure created'));
    return config.outputPath;
  }
  
  static async setupGitHubRepository(config) {
    console.log(chalk.blue('🌐 Setting up GitHub repository...'));
    
    const githubSetup = new GitHubSetup(config);
    await githubSetup.createRepository();
    await githubSetup.setupBranchProtection();
    await githubSetup.setupSecrets();
    
    console.log(chalk.green('✅ GitHub repository configured'));
  }
  
  static async setupAutomation(config, repoPath) {
    console.log(chalk.blue('⚙️ Setting up automation...'));
    
    // Initialize git repository
    const git = simpleGit(repoPath);
    await git.init();
    await git.addRemote('origin', `https://github.com/${config.organization}/${config.name}.git`);
    
    // Create initial commit
    await git.add('.');
    await git.commit('Initial SDK collection setup via sdk-init');
    
    console.log(chalk.green('✅ Automation configured'));
  }
  
  static async validateCreatedStructure(repoPath) {
    console.log(chalk.blue('🔍 Validating created structure...'));
    
    const validator = new Validator();
    const results = await validator.validateRepository(repoPath);
    
    if (results.isValid) {
      console.log(chalk.green('✅ Structure validation passed'));
    } else {
      console.log(chalk.yellow('⚠️  Validation warnings:'));
      results.warnings.forEach(warning => {
        console.log(chalk.yellow(`  - ${warning}`));
      });
    }
    
    return results;
  }
  
  static showDryRunOutput(config) {
    console.log(chalk.cyan('Repository Configuration:'));
    console.log(`  Name: ${config.name}`);
    console.log(`  Type: ${config.type}`);
    console.log(`  Language: ${config.language}`);
    console.log(`  Container: ${config.containerName}`);
    console.log(`  Organization: ${config.organization}`);
    console.log(`  Output Path: ${config.outputPath}`);
    
    console.log(chalk.cyan('\\nFiles that would be created:'));
    console.log('  📄 README.md');
    console.log('  📄 LICENSE');
    console.log('  📄 Dockerfile');
    console.log('  📄 VERSION.txt');
    console.log('  📁 .github/workflows/');
    console.log('  📁 .devcontainer/');
    console.log('  📁 docs/');
    console.log('  📁 examples/');
    
    console.log(chalk.cyan('\\nAutomation that would be setup:'));
    console.log('  🔄 CI/CD workflows');
    console.log('  🐙 GitHub repository');
    console.log('  🔒 Branch protection');
    console.log('  🔑 Secrets configuration');
  }
}

module.exports = CreateCommand;
/**
 * Interactive Command - Interactive SDK creation wizard
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const CreateCommand = require('./create');

class InteractiveCommand {
  static async execute(options, command) {
    console.log(chalk.blue.bold('🧙 Interactive SDK Creation Wizard\\n'));
    console.log(chalk.cyan('This wizard will guide you through creating a new SDK collection for the Defense Builders ecosystem.\\n'));
    
    try {
      // Gather basic information
      const basicInfo = await this.gatherBasicInformation();
      
      // Gather SDK-specific configuration
      const sdkConfig = await this.gatherSDKConfiguration(basicInfo);
      
      // Gather container configuration
      const containerConfig = await this.gatherContainerConfiguration(basicInfo, sdkConfig);
      
      // Gather GitHub configuration
      const githubConfig = await this.gatherGitHubConfiguration();
      
      // Combine all configuration
      const config = {
        ...basicInfo,
        ...sdkConfig,
        ...containerConfig,
        ...githubConfig
      };
      
      // Show summary and confirm
      const confirmed = await this.showSummaryAndConfirm(config);
      
      if (!confirmed) {
        console.log(chalk.yellow('🛑 SDK creation cancelled'));
        return;
      }
      
      // Execute creation
      console.log(chalk.blue.bold('\\n🚀 Creating SDK collection...\\n'));
      await CreateCommand.execute(config.name, this.buildCreateOptions(config), command);
      
    } catch (error) {
      if (error.isTtyError) {
        console.error(chalk.red('❌ Interactive mode not supported in this environment'));
        console.log(chalk.blue('💡 Try using the non-interactive commands instead'));
      } else {
        console.error(chalk.red.bold('❌ Interactive wizard failed:'));
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  }
  
  static async gatherBasicInformation() {
    console.log(chalk.green.bold('📋 Basic Information\\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'SDK name (lowercase, hyphens allowed):',
        validate: (input) => {
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'Name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'SDK description:',
        default: (answers) => `${answers.name} SDK for Defense Builders`
      },
      {
        type: 'list',
        name: 'type',
        message: 'SDK type:',
        choices: [
          { name: '📱 Mobile Android (ATAK-CIV style)', value: 'mobile-android' },
          { name: '🖥️  Desktop Windows (WinTAK style)', value: 'desktop-windows' },
          { name: '🖥️  Server/API', value: 'server' },
          { name: '🌐 Web Application', value: 'web' },
          { name: '⚙️  Embedded/IoT', value: 'embedded' }
        ]
      }
    ]);
    
    return answers;
  }
  
  static async gatherSDKConfiguration(basicInfo) {
    console.log(chalk.green.bold('\\n⚙️  SDK Configuration\\n'));
    
    const languageChoices = this.getLanguageChoices(basicInfo.type);
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Primary programming language:',
        choices: languageChoices
      }
    ]);
    
    // Version-specific questions based on language
    const versionQuestions = this.getVersionQuestions(basicInfo.type, answers.language);
    const versionAnswers = await inquirer.prompt(versionQuestions);
    
    return { ...answers, ...versionAnswers };
  }
  
  static getLanguageChoices(type) {
    const languages = {
      'mobile-android': [
        { name: 'Java', value: 'java' },
        { name: 'Kotlin', value: 'kotlin' }
      ],
      'desktop-windows': [
        { name: 'C#/.NET', value: 'csharp' },
        { name: 'C++', value: 'cpp' }
      ],
      'server': [
        { name: 'Java', value: 'java' },
        { name: 'JavaScript/Node.js', value: 'javascript' },
        { name: 'Python', value: 'python' },
        { name: 'Go', value: 'go' }
      ],
      'web': [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'TypeScript', value: 'typescript' }
      ],
      'embedded': [
        { name: 'C++', value: 'cpp' },
        { name: 'C', value: 'c' },
        { name: 'Rust', value: 'rust' }
      ]
    };
    
    return languages[type] || [{ name: 'Other', value: 'other' }];
  }
  
  static getVersionQuestions(type, language) {
    const questions = [];
    
    if (language === 'java' || type === 'mobile-android') {
      questions.push({
        type: 'list',
        name: 'javaVersion',
        message: 'Java version:',
        choices: ['11', '17', '21'],
        default: '11'
      });
      
      questions.push({
        type: 'list',
        name: 'gradleVersion',
        message: 'Gradle version:',
        choices: ['7.6', '8.0', '8.5'],
        default: '7.6'
      });
    }
    
    if (type === 'mobile-android') {
      questions.push({
        type: 'list',
        name: 'androidApi',
        message: 'Target Android API level:',
        choices: ['30', '31', '33', '34'],
        default: '30'
      });
    }
    
    if (language === 'csharp') {
      questions.push({
        type: 'list',
        name: 'dotnetVersion',
        message: '.NET version:',
        choices: ['6.0', '7.0', '8.0'],
        default: '8.0'
      });
    }
    
    if (language === 'javascript' || language === 'typescript') {
      questions.push({
        type: 'list',
        name: 'nodeVersion',
        message: 'Node.js version:',
        choices: ['16', '18', '20'],
        default: '18'
      });
    }
    
    return questions;
  }
  
  static async gatherContainerConfiguration(basicInfo, sdkConfig) {
    console.log(chalk.green.bold('\\n🐳 Container Configuration\\n'));
    
    const defaultBase = this.getDefaultContainerBase(basicInfo.type, sdkConfig.language);
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'containerBase',
        message: 'Base container image:',
        default: defaultBase
      },
      {
        type: 'confirm',
        name: 'includeDevcontainer',
        message: 'Include VS Code devcontainer configuration?',
        default: true
      }
    ]);
    
    return answers;
  }
  
  static getDefaultContainerBase(type, language) {
    const defaults = {
      'mobile-android': 'openjdk:11-jdk',
      'desktop-windows': language === 'csharp' ? 'mcr.microsoft.com/dotnet/sdk:8.0' : 'mcr.microsoft.com/windows/servercore:ltsc2022',
      'server': {
        'java': 'openjdk:11-jdk',
        'javascript': 'node:18-alpine',
        'python': 'python:3.11-slim',
        'go': 'golang:1.21-alpine'
      }[language] || 'ubuntu:22.04',
      'web': 'node:18-alpine',
      'embedded': 'gcc:latest'
    };
    
    return defaults[type] || 'ubuntu:22.04';
  }
  
  static async gatherGitHubConfiguration() {
    console.log(chalk.green.bold('\\n🐙 GitHub Configuration\\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'org',
        message: 'GitHub organization:',
        default: 'iotactical'
      },
      {
        type: 'confirm',
        name: 'private',
        message: 'Create private repository?',
        default: false
      },
      {
        type: 'confirm',
        name: 'setupAutomation',
        message: 'Setup GitHub automation (CI/CD, secrets, etc.)?',
        default: true
      }
    ]);
    
    return answers;
  }
  
  static async showSummaryAndConfirm(config) {
    console.log(chalk.green.bold('\\n📋 Configuration Summary\\n'));
    
    console.log(chalk.cyan('Basic Information:'));
    console.log(`  Name: ${config.name}`);
    console.log(`  Description: ${config.description}`);
    console.log(`  Type: ${config.type}`);
    console.log(`  Language: ${config.language}`);
    
    console.log(chalk.cyan('\\nTechnical Configuration:'));
    if (config.javaVersion) console.log(`  Java Version: ${config.javaVersion}`);
    if (config.gradleVersion) console.log(`  Gradle Version: ${config.gradleVersion}`);
    if (config.androidApi) console.log(`  Android API: ${config.androidApi}`);
    if (config.dotnetVersion) console.log(`  .NET Version: ${config.dotnetVersion}`);
    if (config.nodeVersion) console.log(`  Node.js Version: ${config.nodeVersion}`);
    
    console.log(chalk.cyan('\\nContainer Configuration:'));
    console.log(`  Base Image: ${config.containerBase}`);
    console.log(`  Include Devcontainer: ${config.includeDevcontainer ? 'Yes' : 'No'}`);
    
    console.log(chalk.cyan('\\nGitHub Configuration:'));
    console.log(`  Organization: ${config.org}`);
    console.log(`  Repository: ${config.org}/${config.name}`);
    console.log(`  Private: ${config.private ? 'Yes' : 'No'}`);
    console.log(`  Setup Automation: ${config.setupAutomation ? 'Yes' : 'No'}`);
    
    console.log();
    
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: 'Create SDK collection with this configuration?',
      default: true
    }]);
    
    return confirmed;
  }
  
  static buildCreateOptions(config) {
    return {
      type: config.type,
      language: config.language,
      description: config.description,
      containerBase: config.containerBase,
      javaVersion: config.javaVersion,
      gradleVersion: config.gradleVersion,
      androidApi: config.androidApi,
      dotnetVersion: config.dotnetVersion,
      nodeVersion: config.nodeVersion,
      org: config.org,
      private: config.private
    };
  }
}

module.exports = InteractiveCommand;
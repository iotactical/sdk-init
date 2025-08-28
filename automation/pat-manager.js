/**
 * PAT Manager - Personal Access Token management and validation
 */

const { Octokit } = require('@octokit/rest');
const chalk = require('chalk');
const inquirer = require('inquirer');

class PATManager {
  constructor() {
    this.requiredScopes = [
      'repo',
      'workflow',
      'write:packages',
      'read:packages'
    ];
  }
  
  async validateToken(token) {
    console.log(chalk.blue('🔍 Validating GitHub Personal Access Token...'));
    
    try {
      const octokit = new Octokit({ auth: token });
      
      // Test basic authentication
      const { data: user } = await octokit.rest.users.getAuthenticated();
      console.log(chalk.green(`✅ Token valid for user: ${user.login}`));
      
      // Check token scopes
      const { headers } = await octokit.request('GET /user');
      const scopes = headers['x-oauth-scopes'] ? headers['x-oauth-scopes'].split(', ') : [];
      
      await this.validateScopes(scopes);
      
      return {
        valid: true,
        user: user.login,
        scopes
      };
      
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid or expired GitHub token');
      } else if (error.status === 403) {
        throw new Error('GitHub token has insufficient permissions');
      } else {
        throw new Error(`Token validation failed: ${error.message}`);
      }
    }
  }
  
  async validateScopes(tokenScopes) {
    console.log(chalk.blue('🔐 Checking token permissions...'));
    
    const missingScopes = [];
    
    for (const requiredScope of this.requiredScopes) {
      if (!this.hasScopePermission(tokenScopes, requiredScope)) {
        missingScopes.push(requiredScope);
      }
    }
    
    if (missingScopes.length > 0) {
      console.log(chalk.yellow('⚠️  Token is missing required permissions:'));
      missingScopes.forEach(scope => {
        console.log(chalk.yellow(`  - ${scope}: ${this.getScopeDescription(scope)}`));
      });
      
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Continue with limited permissions? (Some features may not work)',
        default: false
      }]);
      
      if (!proceed) {
        throw new Error('Insufficient token permissions. Please create a new token with the required scopes.');
      }
    } else {
      console.log(chalk.green('✅ All required permissions present'));
    }
    
    return {
      hasAllScopes: missingScopes.length === 0,
      missingScopes,
      presentScopes: tokenScopes
    };
  }
  
  hasScopePermission(tokenScopes, requiredScope) {
    // Check for exact match or broader permissions
    if (tokenScopes.includes(requiredScope)) {
      return true;
    }
    
    // Check for broader scopes that include the required permission
    const scopeHierarchy = {
      'repo': ['public_repo'],
      'workflow': [],
      'write:packages': ['packages'],
      'read:packages': ['packages', 'write:packages']
    };
    
    const broaderScopes = scopeHierarchy[requiredScope] || [];
    return broaderScopes.some(scope => tokenScopes.includes(scope));
  }
  
  getScopeDescription(scope) {
    const descriptions = {
      'repo': 'Full control of private repositories',
      'workflow': 'Update GitHub Action workflows',
      'write:packages': 'Upload packages to GitHub Package Registry',
      'read:packages': 'Download packages from GitHub Package Registry'
    };
    
    return descriptions[scope] || 'Unknown permission';
  }
  
  async generateTokenInstructions() {
    console.log(chalk.blue.bold('\\n🔑 GitHub Personal Access Token Setup\\n'));
    
    console.log('To create a Personal Access Token:');
    console.log('1. Go to: https://github.com/settings/tokens');
    console.log('2. Click "Generate new token" → "Generate new token (classic)"');
    console.log('3. Add a descriptive note (e.g., "Defense Builders SDK Init")');
    console.log('4. Select the following scopes:');
    
    this.requiredScopes.forEach(scope => {
      console.log(`   ☐ ${chalk.cyan(scope)} - ${this.getScopeDescription(scope)}`);
    });
    
    console.log('5. Click "Generate token"');
    console.log('6. Copy the token (you won\\'t be able to see it again)');
    console.log();
  }
  
  async interactiveTokenSetup() {
    console.log(chalk.blue.bold('🔐 Interactive Token Setup\\n'));
    
    // Show instructions
    await this.generateTokenInstructions();
    
    const { hasToken } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasToken',
      message: 'Do you have a GitHub Personal Access Token ready?',
      default: false
    }]);
    
    if (!hasToken) {
      console.log(chalk.yellow('\\nPlease create a token first, then run this command again.'));
      process.exit(0);
    }
    
    const { token } = await inquirer.prompt([{
      type: 'password',
      name: 'token',
      message: 'Enter your GitHub Personal Access Token:',
      mask: '*',
      validate: (input) => {
        if (!input || input.length < 10) {
          return 'Please enter a valid GitHub token';
        }
        if (!input.startsWith('ghp_') && !input.startsWith('github_pat_')) {
          return 'Token should start with "ghp_" or "github_pat_"';
        }
        return true;
      }
    }]);
    
    // Validate the token
    const validation = await this.validateToken(token);
    
    const { saveToEnv } = await inquirer.prompt([{
      type: 'confirm',
      name: 'saveToEnv',
      message: 'Save token to environment variable GITHUB_TOKEN for future use?',
      default: true
    }]);
    
    if (saveToEnv) {
      console.log(chalk.blue('\\n💡 Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):'));
      console.log(chalk.cyan(`export GITHUB_TOKEN="${token}"`));
      console.log();
    }
    
    return {
      token,
      validation
    };
  }
  
  async testTokenPermissions(token, organization, repository) {
    console.log(chalk.blue('🧪 Testing token permissions...'));
    
    const octokit = new Octokit({ auth: token });
    const tests = [];
    
    // Test repository access
    try {
      await octokit.rest.repos.get({
        owner: organization,
        repo: repository
      });
      tests.push({ name: 'Repository access', status: 'pass' });
    } catch (error) {
      if (error.status === 404) {
        tests.push({ name: 'Repository access', status: 'unknown', note: 'Repository not found or private' });
      } else {
        tests.push({ name: 'Repository access', status: 'fail', error: error.message });
      }
    }
    
    // Test workflow permissions
    try {
      await octokit.rest.actions.listRepoWorkflows({
        owner: organization,
        repo: repository
      });
      tests.push({ name: 'Workflow access', status: 'pass' });
    } catch (error) {
      tests.push({ name: 'Workflow access', status: 'fail', error: error.message });
    }
    
    // Test package permissions
    try {
      await octokit.rest.packages.listPackagesForOrganization({
        org: organization,
        package_type: 'container'
      });
      tests.push({ name: 'Package access', status: 'pass' });
    } catch (error) {
      tests.push({ name: 'Package access', status: 'fail', error: error.message });
    }
    
    // Display results
    console.log(chalk.blue('\\n📋 Permission Test Results:\\n'));
    tests.forEach(test => {
      const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '❓';
      const color = test.status === 'pass' ? chalk.green : test.status === 'fail' ? chalk.red : chalk.yellow;
      
      console.log(`${icon} ${color(test.name)}`);
      if (test.error) {
        console.log(`  ${chalk.gray(`Error: ${test.error}`)}`);
      }
      if (test.note) {
        console.log(`  ${chalk.gray(`Note: ${test.note}`)}`);
      }
    });
    
    console.log();
    return tests;
  }
}

module.exports = PATManager;
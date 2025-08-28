/**
 * GitHub Setup - Automated GitHub repository configuration
 */

const { Octokit } = require('@octokit/rest');
const chalk = require('chalk');

class GitHubSetup {
  constructor(config) {
    this.config = config;
    this.octokit = config.octokit || new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
  }
  
  async createRepository() {
    console.log(chalk.blue(`🏗️  Creating GitHub repository: ${this.config.organization}/${this.config.name}`));
    
    try {
      // Check if repository already exists
      try {
        await this.octokit.rest.repos.get({
          owner: this.config.organization,
          repo: this.config.name
        });
        
        console.log(chalk.yellow('⚠️  Repository already exists'));
        return;
        
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }
      
      // Create the repository
      const createParams = {
        name: this.config.name,
        description: this.config.description,
        private: this.config.isPrivate || false,
        has_issues: true,
        has_projects: false,
        has_wiki: false,
        auto_init: false,
        allow_squash_merge: true,
        allow_merge_commit: false,
        allow_rebase_merge: true,
        delete_branch_on_merge: true
      };
      
      // Create in organization or user account
      if (this.config.organization !== 'personal') {
        await this.octokit.rest.repos.createInOrg({
          org: this.config.organization,
          ...createParams
        });
      } else {
        await this.octokit.rest.repos.createForAuthenticatedUser(createParams);
      }
      
      console.log(chalk.green('✅ Repository created successfully'));
      
    } catch (error) {
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }
  
  async setupBranchProtection() {
    console.log(chalk.blue('🛡️  Setting up branch protection rules'));
    
    try {
      await this.octokit.rest.repos.updateBranchProtection({
        owner: this.config.organization,
        repo: this.config.name,
        branch: 'main',
        required_status_checks: {
          strict: true,
          contexts: ['build']
        },
        enforce_admins: false,
        required_pull_request_reviews: {
          required_approving_review_count: 1,
          dismiss_stale_reviews: true,
          require_code_owner_reviews: false
        },
        restrictions: null,
        allow_force_pushes: false,
        allow_deletions: false
      });
      
      console.log(chalk.green('✅ Branch protection configured'));
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not setup branch protection: ${error.message}`));
    }
  }
  
  async setupSecrets() {
    console.log(chalk.blue('🔒 Setting up repository secrets'));
    
    try {
      // Setup secrets needed for the CI/CD pipeline
      const secrets = await this.generateRequiredSecrets();
      
      for (const [name, value] of Object.entries(secrets)) {
        await this.createSecret(name, value);
      }
      
      console.log(chalk.green('✅ Secrets configured'));
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not setup secrets: ${error.message}`));
    }
  }
  
  async generateRequiredSecrets() {
    // This would generate or prompt for required secrets
    return {
      // DEFENSE_BUILDERS_PAT would be set separately
    };
  }
  
  async createSecret(name, value) {
    // Get repository public key for encryption
    const { data: publicKey } = await this.octokit.rest.actions.getRepoPublicKey({
      owner: this.config.organization,
      repo: this.config.name
    });
    
    // Encrypt the secret value
    const sodium = require('tweetsodium');
    const messageBytes = Buffer.from(value);
    const keyBytes = Buffer.from(publicKey.key, 'base64');
    const encryptedBytes = sodium.seal(messageBytes, keyBytes);
    const encryptedValue = Buffer.from(encryptedBytes).toString('base64');
    
    // Create the secret
    await this.octokit.rest.actions.createOrUpdateRepoSecret({
      owner: this.config.organization,
      repo: this.config.name,
      secret_name: name,
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id
    });
  }
  
  async configureRepository(settings) {
    console.log(chalk.blue('⚙️  Configuring repository settings'));
    
    try {
      await this.octokit.rest.repos.update({
        owner: this.config.organization,
        repo: this.config.name,
        ...settings
      });
      
      console.log(chalk.green('✅ Repository settings updated'));
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not update settings: ${error.message}`));
    }
  }
  
  async setupLabels() {
    console.log(chalk.blue('🏷️  Setting up issue labels'));
    
    const labels = [
      { name: 'bug', color: 'd73a49', description: 'Something isn\'t working' },
      { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
      { name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
      { name: 'security', color: 'b60205', description: 'Security-related issues' },
      { name: 'automation', color: '1d76db', description: 'CI/CD and automation related' },
      { name: 'sdk-update', color: '0e8a16', description: 'SDK version or configuration updates' }
    ];
    
    try {
      for (const label of labels) {
        try {
          await this.octokit.rest.issues.createLabel({
            owner: this.config.organization,
            repo: this.config.name,
            ...label
          });
        } catch (error) {
          if (error.status !== 422) { // Label already exists
            throw error;
          }
        }
      }
      
      console.log(chalk.green('✅ Issue labels configured'));
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not setup labels: ${error.message}`));
    }
  }
  
  async setupIssueTemplates() {
    console.log(chalk.blue('📋 Setting up issue and PR templates'));
    
    const templates = {
      '.github/ISSUE_TEMPLATE/bug_report.md': this.getBugReportTemplate(),
      '.github/ISSUE_TEMPLATE/feature_request.md': this.getFeatureRequestTemplate(),
      '.github/PULL_REQUEST_TEMPLATE.md': this.getPullRequestTemplate()
    };
    
    // This would create the template files in the repository
    // For now, we'll log what would be created
    console.log(chalk.blue('📝 Issue and PR templates would be created:'));
    Object.keys(templates).forEach(template => {
      console.log(`  - ${template}`);
    });
  }
  
  getBugReportTemplate() {
    return `---
name: Bug report
about: Create a report to help us improve
title: ''
labels: 'bug'
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - SDK Version: [e.g. 1.0.0]
 - Container Version: [e.g. latest]

**Additional context**
Add any other context about the problem here.
`;
  }
  
  getFeatureRequestTemplate() {
    return `---
name: Feature request
about: Suggest an idea for this SDK collection
title: ''
labels: 'enhancement'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
`;
  }
  
  getPullRequestTemplate() {
    return `## Description
Brief description of changes made in this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] SDK version update

## Testing
- [ ] Tests pass locally
- [ ] Container builds successfully
- [ ] Manual testing completed

## Checklist
- [ ] Code follows the project's coding standards
- [ ] Self-review completed
- [ ] Documentation updated if needed
- [ ] No sensitive information exposed
- [ ] Version bumped if needed

## Additional Notes
Add any additional notes or context about the changes.
`;
  }
}

module.exports = GitHubSetup;